import mongoose from "mongoose";
import { Conversation, Message } from "../models/index.js";
import { User } from "../models/user.model.js";
import { catchAsyncHandler } from "../middleware/error.middleware.js";

const toId = (value) => (value ? String(value) : "");

const getWorkspaceContext = (req) => {
  const role = String(req.user?.role || "");
  const isSuperAdmin = role === "super-admin";
  const workspaceId = String(req.user?.workspaceId || "").trim();
  return { isSuperAdmin, workspaceId };
};

const ensureWorkspaceAccess = (req, res) => {
  const ctx = getWorkspaceContext(req);
  if (!ctx.isSuperAdmin && !ctx.workspaceId) {
    res.status(400).json({ message: "Workspace is required for this action" });
    return null;
  }
  return ctx;
};

const findVisitorUserIdByVisitorTag = async ({
  visitorTag,
  workspaceId = "",
  isSuperAdmin = false,
}) => {
  if (!visitorTag) return null;
  const conversation = await Conversation.findOne({
    visitorId: visitorTag,
    ...(!isSuperAdmin && workspaceId ? { workspaceId } : {}),
  })
    .select("visitorUserId")
    .sort({ updatedAt: -1 });
  return conversation?.visitorUserId || null;
};

const buildUnreadCountsForUser = async (userId, workspaceId = "") => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return { total: 0, bySender: {} };
  }

  const receiverObjectId = new mongoose.Types.ObjectId(userId);
  const workspaceMatch =
    workspaceId && mongoose.Types.ObjectId.isValid(workspaceId)
      ? { workspaceId: new mongoose.Types.ObjectId(workspaceId) }
      : {};

  const unreadRows = await Message.aggregate([
    {
      $match: {
        receiverId: receiverObjectId,
        readAt: null,
        ...workspaceMatch,
      },
    },
    {
      $group: {
        _id: "$senderId",
        count: { $sum: 1 },
      },
    },
  ]);

  let total = 0;
  const bySender = {};
  for (const row of unreadRows) {
    const senderId = toId(row?._id);
    if (!senderId) continue;
    const count = Number(row?.count || 0);
    bySender[senderId] = count;
    total += count;
  }

  return { total, bySender };
};

// Get direct messages between current user and another user
export const getDirectMessages = catchAsyncHandler(async (req, res) => {
  const workspaceCtx = ensureWorkspaceAccess(req, res);
  if (!workspaceCtx) return;
  const { userId } = req.params;
  const currentUserId = toId(req.user.id);
  const currentUserRole = String(req.user?.role || "").trim().toLowerCase();

  let targetUserId = userId;
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    const resolvedVisitorUserId = await findVisitorUserIdByVisitorTag({
      visitorTag: userId,
      workspaceId: workspaceCtx.workspaceId,
      isSuperAdmin: workspaceCtx.isSuperAdmin,
    });
    if (!resolvedVisitorUserId) {
      return res.status(200).json({ data: [] });
    }
    targetUserId = toId(resolvedVisitorUserId);
  }

  let targetUser = null;
  if (!workspaceCtx.isSuperAdmin) {
    targetUser = await User.findOne({
      _id: targetUserId,
      workspaceId: workspaceCtx.workspaceId,
    }).select("_id role");
    if (!targetUser) {
      return res.status(404).json({ message: "Conversation user not found" });
    }
  } else {
    targetUser = await User.findById(targetUserId).select("_id role");
  }

  const shouldUseVisitorConversationView =
    (currentUserRole === "owner" ||
      currentUserRole === "admin" ||
      currentUserRole === "super-admin") &&
    String(targetUser?.role || "").toLowerCase() === "viewer";

  // Owner/Admin should be able to inspect full visitor conversation threads
  // even when another staff member is currently assigned.
  if (shouldUseVisitorConversationView) {
    const latestConversation = await Conversation.findOne({
      visitorUserId: targetUserId,
      ...(!workspaceCtx.isSuperAdmin
        ? { workspaceId: workspaceCtx.workspaceId }
        : {}),
    })
      .select("_id")
      .sort({ updatedAt: -1 });

    if (!latestConversation) {
      return res.status(200).json({ data: [] });
    }

    const messages = await Message.find({
      conversationId: latestConversation._id,
      ...(!workspaceCtx.isSuperAdmin
        ? { workspaceId: workspaceCtx.workspaceId }
        : {}),
    })
      .populate("senderId", "name email role")
      .populate("receiverId", "name email role")
      .sort({ createdAt: 1 });

    const formattedMessages = messages.map((msg) => ({
      _id: toId(msg._id),
      senderId: toId(msg.senderId?._id || msg.senderId),
      senderName: msg.senderId?.name || "Unknown",
      receiverId: toId(msg.receiverId?._id || msg.receiverId),
      content: msg.content,
      attachments: Array.isArray(msg.attachments) ? msg.attachments : [],
      senderType: msg.senderType,
      readAt: msg.readAt,
      createdAt: msg.createdAt,
      workspaceId: toId(msg.workspaceId),
    }));

    return res.status(200).json({ data: formattedMessages });
  }

  await Message.updateMany(
    {
      senderId: targetUserId,
      receiverId: currentUserId,
      readAt: null,
      ...(!workspaceCtx.isSuperAdmin
        ? { workspaceId: workspaceCtx.workspaceId }
        : {}),
    },
    {
      $set: { readAt: new Date() },
    },
  );

  const messages = await Message.find({
    ...(!workspaceCtx.isSuperAdmin
      ? { workspaceId: workspaceCtx.workspaceId }
      : {}),
    $or: [
      { senderId: currentUserId, receiverId: targetUserId },
      { senderId: targetUserId, receiverId: currentUserId },
    ],
  })
    .populate("senderId", "name email role")
    .populate("receiverId", "name email role")
    .sort({ createdAt: 1 });

  const formattedMessages = messages.map((msg) => ({
    _id: toId(msg._id),
    senderId: toId(msg.senderId?._id || msg.senderId),
    senderName: msg.senderId?.name || "Unknown",
    receiverId: toId(msg.receiverId?._id || msg.receiverId),
    content: msg.content,
    attachments: Array.isArray(msg.attachments) ? msg.attachments : [],
    senderType: msg.senderType,
    readAt: msg.readAt,
    createdAt: msg.createdAt,
    workspaceId: toId(msg.workspaceId),
  }));

  return res.status(200).json({ data: formattedMessages });
});

// Get list of users the current user has chatted with
export const getDirectMessageUsers = catchAsyncHandler(async (req, res) => {
  const workspaceCtx = ensureWorkspaceAccess(req, res);
  if (!workspaceCtx) return;
  const currentUserId = toId(req.user.id);
  const unreadSummary = await buildUnreadCountsForUser(
    currentUserId,
    workspaceCtx.isSuperAdmin ? "" : workspaceCtx.workspaceId,
  );

  const messages = await Message.find({
    ...(!workspaceCtx.isSuperAdmin
      ? { workspaceId: workspaceCtx.workspaceId }
      : {}),
    $or: [{ senderId: currentUserId }, { receiverId: currentUserId }],
  })
    .populate("senderId", "name email role status")
    .populate("receiverId", "name email role status")
    .sort({ createdAt: -1 });

  const usersMap = new Map();

  for (const msg of messages) {
    const senderIdStr = msg.senderId?._id
      ? toId(msg.senderId._id)
      : toId(msg.senderId);
    const otherUser =
      senderIdStr === currentUserId ? msg.receiverId : msg.senderId;
    const otherUserId = toId(otherUser?._id || otherUser);
    if (!otherUserId || usersMap.has(otherUserId)) continue;

    let userPayload = null;
    if (otherUser?._id) {
      userPayload = {
        _id: otherUserId,
        name: otherUser.name,
        email: otherUser.email,
        role: otherUser.role,
        status: otherUser.status,
      };
    } else if (mongoose.Types.ObjectId.isValid(otherUserId)) {
      const user = await User.findById(otherUserId)
        .select("_id name email role status")
        .lean();
      if (user) {
        userPayload = {
          _id: toId(user._id),
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
        };
      }
    }

    if (!userPayload) continue;
    usersMap.set(otherUserId, {
      ...userPayload,
      lastMessage: msg.content,
      lastMessageAt: msg.createdAt,
      lastSenderId: senderIdStr,
      unreadCount: Number(unreadSummary.bySender[otherUserId] || 0),
    });
  }

  return res.status(200).json({
    data: Array.from(usersMap.values()),
    unreadCounts: unreadSummary,
  });
});

export const getUnreadDirectMessageCounts = catchAsyncHandler(
  async (req, res) => {
    const workspaceCtx = ensureWorkspaceAccess(req, res);
    if (!workspaceCtx) return;
    const currentUserId = toId(req.user.id);
    const unreadSummary = await buildUnreadCountsForUser(
      currentUserId,
      workspaceCtx.isSuperAdmin ? "" : workspaceCtx.workspaceId,
    );
    return res.status(200).json({ data: unreadSummary });
  },
);

export const updateDirectMessageById = catchAsyncHandler(async (req, res) => {
  const workspaceCtx = ensureWorkspaceAccess(req, res);
  if (!workspaceCtx) return;
  const { messageId } = req.params;
  const currentUserId = toId(req.user.id);
  const content = String(req.body?.content || "").trim();

  if (!content) {
    return res.status(400).json({ message: "Message content is required" });
  }

  const messageQuery = { _id: messageId };
  if (!workspaceCtx.isSuperAdmin) {
    messageQuery.workspaceId = workspaceCtx.workspaceId;
  }
  const message = await Message.findOne(messageQuery);
  if (!message) {
    return res.status(404).json({ message: "Message not found" });
  }

  if (toId(message.senderId) !== currentUserId) {
    return res
      .status(403)
      .json({ message: "You can edit only your own messages" });
  }

  message.content = content;
  await message.save();

  const payload = {
    _id: toId(message._id),
    senderId: toId(message.senderId),
    receiverId: toId(message.receiverId),
    senderType: message.senderType,
    content: message.content,
    attachments: Array.isArray(message.attachments) ? message.attachments : [],
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
  };

  const io = req.app.get("io");
  if (io) {
    [payload.senderId, payload.receiverId]
      .filter(Boolean)
      .forEach((userId) => io.to(userId).emit("message_updated", payload));
  }

  return res.status(200).json({ data: payload });
});

export const deleteDirectMessageById = catchAsyncHandler(async (req, res) => {
  const workspaceCtx = ensureWorkspaceAccess(req, res);
  if (!workspaceCtx) return;
  const { messageId } = req.params;
  const currentUserId = toId(req.user.id);

  const messageQuery = { _id: messageId };
  if (!workspaceCtx.isSuperAdmin) {
    messageQuery.workspaceId = workspaceCtx.workspaceId;
  }
  const message = await Message.findOne(messageQuery);
  if (!message) {
    return res.status(404).json({ message: "Message not found" });
  }

  if (toId(message.senderId) !== currentUserId) {
    return res
      .status(403)
      .json({ message: "You can delete only your own messages" });
  }

  const senderId = toId(message.senderId);
  const receiverId = toId(message.receiverId);
  await Message.deleteOne({ _id: messageId });

  const io = req.app.get("io");
  if (io) {
    [senderId, receiverId]
      .filter(Boolean)
      .forEach((userId) =>
        io
          .to(userId)
          .emit("message_deleted", { messageId, senderId, receiverId }),
      );
  }

  return res.status(200).json({ message: "Message deleted successfully" });
});
