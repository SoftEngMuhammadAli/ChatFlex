import { catchAsyncHandler } from "../middleware/error.middleware.js";
import {
  AutomationRule,
  CannedResponse,
  Conversation,
  FAQ,
  Integration,
  ImpersonationSession,
  Message,
  Notification,
  RoutingState,
  Usage,
  User,
  WidgetTemplate,
  WorkflowTask,
  Workspace,
} from "../models/index.js";

const normalizeText = (value) => String(value || "").trim();

const ensureAuth = (req, res) => {
  if (!req.user?._id) {
    res.status(401).json({ message: "Unauthorized" });
    return null;
  }
  return req.user;
};

const buildWorkspaceScope = (req) => {
  const role = String(req.user?.role || "");
  const isSuperAdmin = role === "super-admin";
  const requestedWorkspaceId = normalizeText(
    req.query?.workspaceId || req.body?.workspaceId,
  );
  const workspaceId = isSuperAdmin
    ? requestedWorkspaceId || normalizeText(req.user?.workspaceId)
    : normalizeText(req.user?.workspaceId);
  return { isSuperAdmin, workspaceId };
};

export const exportMyData = catchAsyncHandler(async (req, res) => {
  const user = ensureAuth(req, res);
  if (!user) return;

  const ctx = buildWorkspaceScope(req);
  const workspaceScope = ctx.isSuperAdmin
    ? {}
    : ctx.workspaceId
      ? { workspaceId: ctx.workspaceId }
      : {};

  const userDoc = await User.findById(user._id)
    .select("-passwordHash -resetPasswordToken -resetPasswordExpires")
    .lean();

  const [notifications, usage, conversations, messages] = await Promise.all([
    Notification.find({ userId: user._id, ...workspaceScope })
      .sort({ createdAt: -1 })
      .lean(),
    Usage.find({ userId: user._id, ...workspaceScope }).lean(),
    Conversation.find({
      ...workspaceScope,
      $or: [
        { assignedTo: user._id },
        { assignedAgent: user._id },
        { initiatedBy: user._id },
        { visitorUserId: user._id },
      ],
    })
      .sort({ updatedAt: -1 })
      .limit(200)
      .lean(),
    Message.find({
      ...workspaceScope,
      $or: [{ senderId: user._id }, { receiverId: user._id }],
    })
      .sort({ createdAt: -1 })
      .limit(500)
      .lean(),
  ]);

  return res.status(200).json({
    data: {
      exportedAt: new Date().toISOString(),
      user: userDoc,
      notifications,
      usage,
      conversations,
      messages,
    },
  });
});

export const deleteMyAccount = catchAsyncHandler(async (req, res) => {
  const user = ensureAuth(req, res);
  if (!user) return;

  const ctx = buildWorkspaceScope(req);
  if (!ctx.isSuperAdmin && !ctx.workspaceId) {
    return res.status(400).json({ message: "Workspace is required" });
  }

  const workspaceScope = ctx.isSuperAdmin
    ? {}
    : { workspaceId: ctx.workspaceId };

  const userId = user._id;

  // If this is a widget visitor, hard-delete their conversations + messages.
  const visitorConversationIds = await Conversation.find({
    ...workspaceScope,
    visitorUserId: userId,
  })
    .select("_id")
    .lean();
  const ids = visitorConversationIds.map((row) => row._id);
  if (ids.length > 0) {
    await Message.deleteMany({ conversationId: { $in: ids }, ...workspaceScope });
    await Conversation.deleteMany({ _id: { $in: ids }, ...workspaceScope });
  }

  // Remove personal references from remaining data.
  await Promise.all([
    Message.updateMany(
      { ...workspaceScope, senderId: userId },
      { $set: { senderId: null } },
    ),
    Message.updateMany(
      { ...workspaceScope, receiverId: userId },
      { $set: { receiverId: null, readAt: new Date() } },
    ),
    Conversation.updateMany(
      { ...workspaceScope, assignedTo: userId },
      { $set: { assignedTo: null, assignedAgent: null } },
    ),
    Conversation.updateMany(
      { ...workspaceScope, assignedAgent: userId },
      { $set: { assignedTo: null, assignedAgent: null } },
    ),
    Conversation.updateMany(
      { ...workspaceScope, initiatedBy: userId },
      { $set: { initiatedBy: null } },
    ),
    Notification.deleteMany({ ...workspaceScope, userId }),
    Usage.deleteMany({ ...workspaceScope, userId }),
    ImpersonationSession.deleteMany({ userId }),
  ]);

  await User.deleteOne({ _id: userId, ...(ctx.isSuperAdmin ? {} : workspaceScope) });

  return res.status(200).json({
    message: "Account deleted",
  });
});

export const deleteWorkspaceData = catchAsyncHandler(async (req, res) => {
  const user = ensureAuth(req, res);
  if (!user) return;

  const role = String(user.role || "");
  if (role !== "super-admin") {
    return res.status(403).json({ message: "Forbidden" });
  }

  const workspaceId = normalizeText(req.params.workspaceId);
  if (!workspaceId) {
    return res.status(400).json({ message: "workspaceId is required" });
  }

  // Hard delete tenant data. (This is intentionally destructive and super-admin only.)
  await Promise.all([
    AutomationRule.deleteMany({ workspaceId }),
    CannedResponse.deleteMany({ workspaceId }),
    FAQ.deleteMany({ workspaceId }),
    Integration.deleteMany({ workspaceId }),
    WorkflowTask.deleteMany({ workspaceId }),
    RoutingState.deleteMany({ workspaceId }),
    Notification.deleteMany({ workspaceId }),
    Usage.deleteMany({ workspaceId }),
    Message.deleteMany({ workspaceId }),
    Conversation.deleteMany({ workspaceId }),
    WidgetTemplate.deleteMany({ workspaceId }),
    User.deleteMany({ workspaceId }),
  ]);

  await Workspace.deleteOne({ _id: workspaceId });

  return res.status(200).json({ message: "Workspace deleted" });
});

