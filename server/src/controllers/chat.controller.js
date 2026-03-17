import { Conversation, Message, Usage } from "../models/index.js";
import { catchAsyncHandler } from "../middleware/error.middleware.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { User } from "../models/user.model.js";
import { executeAutomationRules } from "../services/automation.service.js";
import { dispatchIntegrationEvent } from "../services/integration.service.js";

const VALID_CONVERSATION_STATUSES = new Set([
  "open",
  "pending",
  "resolved",
  "escalated",
]);
const TYPING_LOCK_TTL_MS = 15000;

const sanitizeAttachments = (attachments) => {
  if (!Array.isArray(attachments)) return [];
  return attachments
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const url = String(item.url || "").trim();
      if (!url) return null;
      const name = String(item.name || "").trim();
      const type = String(item.type || "").trim();
      const size = Number(item.size);
      return {
        url,
        ...(type ? { type } : {}),
        ...(name ? { name } : {}),
        ...(Number.isFinite(size) && size > 0 ? { size } : {}),
      };
    })
    .filter(Boolean);
};

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

const parseDate = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const escapeRegex = (value) =>
  String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeTags = (input) => {
  const raw = Array.isArray(input)
    ? input
    : String(input || "")
        .split(",")
        .map((tag) => tag.trim());

  return Array.from(
    new Set(
      raw
        .map((tag) => String(tag || "").trim())
        .filter(Boolean)
        .slice(0, 20),
    ),
  );
};

const isTypingLockActive = (typingLock) => {
  const expiresAt = typingLock?.expiresAt
    ? new Date(typingLock.expiresAt)
    : null;
  if (!expiresAt || Number.isNaN(expiresAt.getTime())) return false;
  return expiresAt.getTime() > Date.now();
};

const buildTypingLockPayload = (conversation) => {
  const lock = conversation?.typingLock || {};
  const isActive = isTypingLockActive(lock);
  return {
    conversationId: String(conversation?._id || ""),
    isActive,
    lockedBy: isActive ? lock?.lockedBy || null : null,
    lockedAt: isActive ? lock?.lockedAt || null : null,
    expiresAt: isActive ? lock?.expiresAt || null : null,
  };
};

const emitConversationLock = (req, conversation) => {
  const io = req.app.get("io");
  if (!io || !conversation) return;

  const workspaceId = String(
    conversation.workspaceId || req.user?.workspaceId || "",
  );
  const payload = buildTypingLockPayload(conversation);

  if (workspaceId) {
    io.to(`workspace:${workspaceId}`).emit(
      "conversation_lock_updated",
      payload,
    );
    return;
  }
  io.to(String(req.user?.id || "")).emit("conversation_lock_updated", payload);
};

const sanitizeInternalNotes = (notes) =>
  Array.isArray(notes)
    ? notes.map((note) => ({
        _id: String(note?._id || ""),
        authorId: note?.authorId || null,
        content: String(note?.content || "").trim(),
        createdAt: note?.createdAt || null,
        updatedAt: note?.updatedAt || null,
      }))
    : [];

// Get all conversations with optional status filter
export const getConversations = catchAsyncHandler(async (req, res) => {
  const workspaceCtx = ensureWorkspaceAccess(req, res);
  if (!workspaceCtx) return;

  const query = {};

  if (!workspaceCtx.isSuperAdmin) {
    query.workspaceId = workspaceCtx.workspaceId;
  }

  const currentUserId = String(req.user?.id || req.user?._id || "");
  const currentUserRole = String(req.user?.role || "");
  const requestedStatus = String(req.query?.status || "")
    .trim()
    .toLowerCase();
  const requestedAssignee = String(
    req.query?.assignedTo || req.query?.agentId || "",
  ).trim();
  const requestedTags = normalizeTags(req.query?.tags);
  const requestedDepartment = String(req.query?.department || "")
    .trim()
    .toLowerCase();
  const searchQuery = String(req.query?.q || req.query?.query || "").trim();
  const dateFrom = parseDate(req.query?.dateFrom || req.query?.from);
  const dateTo = parseDate(req.query?.dateTo || req.query?.to);
  const limit = Math.max(1, Math.min(Number(req.query?.limit) || 100, 500));

  if (requestedStatus && !VALID_CONVERSATION_STATUSES.has(requestedStatus)) {
    return res.status(400).json({ message: "Invalid conversation status" });
  }

  if (requestedStatus) {
    query.status = requestedStatus;
  }

  if (requestedAssignee) {
    query.assignedTo = requestedAssignee;
  }

  if (requestedTags.length > 0) {
    query.tags = { $in: requestedTags };
  }

  if (requestedDepartment) {
    query.department = requestedDepartment;
  }

  if (dateFrom || dateTo) {
    const dateRange = {};
    if (dateFrom) {
      dateRange.$gte = dateFrom;
    }
    if (dateTo) {
      const endOfDay = new Date(dateTo);
      endOfDay.setHours(23, 59, 59, 999);
      dateRange.$lte = endOfDay;
    }
    query.createdAt = dateRange;
  }

  if (searchQuery) {
    const searchPattern = new RegExp(escapeRegex(searchQuery), "i");
    const scopedMessageQuery = {
      content: searchPattern,
    };
    if (!workspaceCtx.isSuperAdmin) {
      scopedMessageQuery.workspaceId = workspaceCtx.workspaceId;
    }
    const matchedMessages = await Message.find(scopedMessageQuery)
      .select("conversationId")
      .limit(300)
      .lean();
    const matchedConversationIds = Array.from(
      new Set(
        matchedMessages
          .map((item) => String(item?.conversationId || "").trim())
          .filter(Boolean),
      ),
    );

    query.$or = [
      { visitorId: searchPattern },
      { tags: searchPattern },
      { department: searchPattern },
      { "metadata.name": searchPattern },
      { "metadata.email": searchPattern },
      { "metadata.phone": searchPattern },
      { "metadata.visitorInfo.pageUrl": searchPattern },
      { "metadata.visitorInfo.country": searchPattern },
      ...(matchedConversationIds.length > 0
        ? [{ _id: { $in: matchedConversationIds } }]
        : []),
    ];
  }

  if (currentUserRole === "agent" && currentUserId) {
    query.assignedTo = currentUserId;
  }

  const conversations = await Conversation.find(query)
    .populate("assignedTo", "name email role status")
    .sort({
      lastMessageAt: -1,
    })
    .limit(limit);
  return res.status(200).json({ data: conversations });
});

// Get messages for a specific conversation
export const getMessages = catchAsyncHandler(async (req, res) => {
  const workspaceCtx = ensureWorkspaceAccess(req, res);
  if (!workspaceCtx) return;
  const conversationQuery = { _id: req.params.id };
  if (!workspaceCtx.isSuperAdmin) {
    conversationQuery.workspaceId = workspaceCtx.workspaceId;
  }
  const conversation =
    await Conversation.findOne(conversationQuery).select("_id");
  if (!conversation) {
    return res.status(404).json({ message: "Conversation not found" });
  }

  const messages = await Message.find({
    conversationId: conversation._id,
  }).sort({ createdAt: 1 });

  if (!messages) {
    return res.status(404).json({ message: "Messages not found" });
  }

  return res.status(200).json({ data: messages });
});

// Post a new message to a conversation
export const postMessage = catchAsyncHandler(async (req, res) => {
  const workspaceCtx = ensureWorkspaceAccess(req, res);
  if (!workspaceCtx) return;
  const { content, attachments } = req.body;

  const conversationQuery = { _id: req.params.id };
  if (!workspaceCtx.isSuperAdmin) {
    conversationQuery.workspaceId = workspaceCtx.workspaceId;
  }
  const conversation = await Conversation.findOne(conversationQuery);

  if (!conversation) {
    return res.status(404).json({ message: "Conversation not found" });
  }

  const message = new Message({
    conversationId: conversation._id,
    workspaceId:
      conversation.workspaceId || workspaceCtx.workspaceId || undefined,
    senderType: "agent",
    senderId: req.user.id,
    receiverId: conversation.visitorUserId || undefined,
    content,
    attachments: sanitizeAttachments(attachments),
  });

  await message.save();

  conversation.lastMessageAt = Date.now();
  if (
    String(conversation?.typingLock?.lockedBy || "") ===
    String(req.user.id || "")
  ) {
    conversation.typingLock = {
      lockedBy: null,
      lockedAt: null,
      expiresAt: null,
    };
  }
  await conversation.save();
  emitConversationLock(req, conversation);

  const workspaceId = String(
    conversation.workspaceId || workspaceCtx.workspaceId || "",
  ).trim();
  if (workspaceId) {
    await executeAutomationRules({
      workspaceId,
      trigger: "agent_message",
      conversation,
      message,
      senderType: "agent",
      actorId: String(req.user?.id || req.user?._id || ""),
    });

    await dispatchIntegrationEvent({
      workspaceId,
      event: "new_message",
      payload: {
        conversationId: String(conversation._id || ""),
        messageId: String(message._id || ""),
        senderType: "agent",
        message: String(message.content || ""),
        status: String(conversation.status || ""),
      },
    });
  }

  return res.status(201).json({ data: message });
});

export const updateMessageById = catchAsyncHandler(async (req, res) => {
  const workspaceCtx = ensureWorkspaceAccess(req, res);
  if (!workspaceCtx) return;
  const { messageId } = req.params;
  const currentUserId = String(req.user.id || "");
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

  if (String(message.senderId || "") !== currentUserId) {
    return res
      .status(403)
      .json({ message: "You can edit only your own messages" });
  }

  message.content = content;
  await message.save();

  const payload = {
    _id: String(message._id),
    senderId: String(message.senderId || ""),
    receiverId: String(message.receiverId || ""),
    senderType: message.senderType,
    content: message.content,
    attachments: Array.isArray(message.attachments) ? message.attachments : [],
    conversationId: String(message.conversationId || ""),
    workspaceId: String(message.workspaceId || ""),
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
  };

  const io = req.app.get("io");
  if (io) {
    [payload.senderId, payload.receiverId].filter(Boolean).forEach((userId) => {
      io.to(userId).emit("message_updated", payload);
    });
  }

  return res.status(200).json({ data: payload });
});

export const deleteMessageById = catchAsyncHandler(async (req, res) => {
  const workspaceCtx = ensureWorkspaceAccess(req, res);
  if (!workspaceCtx) return;
  const { messageId } = req.params;
  const currentUserId = String(req.user.id || "");

  const messageQuery = { _id: messageId };
  if (!workspaceCtx.isSuperAdmin) {
    messageQuery.workspaceId = workspaceCtx.workspaceId;
  }
  const message = await Message.findOne(messageQuery);
  if (!message) {
    return res.status(404).json({ message: "Message not found" });
  }

  if (String(message.senderId || "") !== currentUserId) {
    return res
      .status(403)
      .json({ message: "You can delete only your own messages" });
  }

  const senderId = String(message.senderId || "");
  const receiverId = String(message.receiverId || "");
  await Message.deleteOne({ _id: messageId });

  const io = req.app.get("io");
  if (io) {
    [senderId, receiverId].filter(Boolean).forEach((userId) => {
      io.to(userId).emit("message_deleted", {
        messageId: String(messageId),
        senderId,
        receiverId,
      });
    });
  }

  return res.status(200).json({ message: "Message deleted successfully" });
});

// Create a new conversation (for manual chats)
export const createConversation = catchAsyncHandler(async (req, res) => {
  const workspaceCtx = ensureWorkspaceAccess(req, res);
  if (!workspaceCtx) return;
  const conversation = await Conversation.create({
    visitorId: "manual-" + Date.now(),
    status: "open",
    lastMessageAt: new Date(),
    workspaceId: workspaceCtx.isSuperAdmin
      ? undefined
      : workspaceCtx.workspaceId,
  });

  const workspaceId = String(
    conversation.workspaceId || workspaceCtx.workspaceId || "",
  ).trim();

  // Count conversation usage for plan limits + analytics.
  if (workspaceId) {
    await Usage.findOneAndUpdate(
      { workspaceId },
      {
        $setOnInsert: {
          workspaceId,
          scope: "workspace",
          conversationsThisMonth: 0,
          aiTokensUsed: 0,
        },
        $inc: { conversationsThisMonth: 1 },
      },
      { upsert: true, new: true },
    );
  }

  if (workspaceId) {
    await executeAutomationRules({
      workspaceId,
      trigger: "conversation_created",
      conversation,
      senderType: "agent",
      actorId: String(req.user?.id || req.user?._id || ""),
    });

    await dispatchIntegrationEvent({
      workspaceId,
      event: "conversation_created",
      payload: {
        conversationId: String(conversation._id || ""),
        status: String(conversation.status || ""),
      },
    });
  }

  return res.status(201).json({ data: conversation });
});

// Update conversation status (open, pending, closed)
export const updateConversationStatus = catchAsyncHandler(async (req, res) => {
  const workspaceCtx = ensureWorkspaceAccess(req, res);
  if (!workspaceCtx) return;
  const status = String(req.body?.status || "")
    .trim()
    .toLowerCase();
  if (!VALID_CONVERSATION_STATUSES.has(status)) {
    return res.status(400).json({ message: "Invalid conversation status" });
  }
  const query = { _id: req.params.id };
  if (!workspaceCtx.isSuperAdmin) {
    query.workspaceId = workspaceCtx.workspaceId;
  }
  const conversation = await Conversation.findOne(query);
  if (!conversation) {
    return res.status(404).json({ message: "Conversation not found" });
  }

  const previousStatus = String(conversation.status || "");
  conversation.status = status;

  if (status === "resolved") {
    conversation.metadata = {
      ...(conversation.metadata || {}),
      resolvedAt: new Date().toISOString(),
    };
  } else if (previousStatus === "resolved" && status !== "resolved") {
    const nextMetadata = { ...(conversation.metadata || {}) };
    delete nextMetadata.resolvedAt;
    conversation.metadata = nextMetadata;
  }

  await conversation.save();

  const workspaceId = String(
    conversation.workspaceId || workspaceCtx.workspaceId || "",
  ).trim();
  if (workspaceId && status === "resolved" && previousStatus !== "resolved") {
    await executeAutomationRules({
      workspaceId,
      trigger: "conversation_resolved",
      conversation,
      senderType: "agent",
      actorId: String(req.user?.id || req.user?._id || ""),
    });

    await dispatchIntegrationEvent({
      workspaceId,
      event: "conversation_resolved",
      payload: {
        conversationId: String(conversation._id || ""),
        status: "resolved",
      },
    });

    if (conversation?.metadata?.leadConverted === true) {
      await dispatchIntegrationEvent({
        workspaceId,
        event: "lead_converted",
        payload: {
          conversationId: String(conversation._id || ""),
          leadConverted: true,
        },
      });
    }
  }

  return res.status(200).json({ data: conversation });
});

// Assign conversation to an agent
export const assignConversation = catchAsyncHandler(async (req, res) => {
  const workspaceCtx = ensureWorkspaceAccess(req, res);
  if (!workspaceCtx) return;
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ message: "userId is required" });
  }

  if (!workspaceCtx.isSuperAdmin) {
    const assignee = await User.findOne({
      _id: userId,
      workspaceId: workspaceCtx.workspaceId,
      role: { $in: ["owner", "admin", "agent"] },
    }).select("_id");

    if (!assignee) {
      return res
        .status(404)
        .json({ message: "Assignee not found in workspace" });
    }
  }

  const conversationQuery = { _id: req.params.id };
  if (!workspaceCtx.isSuperAdmin) {
    conversationQuery.workspaceId = workspaceCtx.workspaceId;
  }

  const conversation = await Conversation.findOneAndUpdate(
    conversationQuery,
    { assignedTo: userId, assignedAgent: userId },
    { new: true },
  ).populate("assignedTo", "name email");

  return res.status(200).json({ data: conversation });
});

export const updateConversationTags = catchAsyncHandler(async (req, res) => {
  const workspaceCtx = ensureWorkspaceAccess(req, res);
  if (!workspaceCtx) return;

  const tags = normalizeTags(req.body?.tags);

  const query = { _id: req.params.id };
  if (!workspaceCtx.isSuperAdmin) {
    query.workspaceId = workspaceCtx.workspaceId;
  }

  const conversation = await Conversation.findOneAndUpdate(
    query,
    { tags },
    { new: true },
  ).populate("assignedTo", "name email");

  if (!conversation) {
    return res.status(404).json({ message: "Conversation not found" });
  }

  return res.status(200).json({ data: conversation });
});

export const addConversationNote = catchAsyncHandler(async (req, res) => {
  const workspaceCtx = ensureWorkspaceAccess(req, res);
  if (!workspaceCtx) return;

  const content = String(req.body?.content || "").trim();
  if (!content) {
    return res.status(400).json({ message: "Note content is required" });
  }

  const query = { _id: req.params.id };
  if (!workspaceCtx.isSuperAdmin) {
    query.workspaceId = workspaceCtx.workspaceId;
  }

  const note = {
    authorId: req.user.id,
    content,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const conversation = await Conversation.findOneAndUpdate(
    query,
    { $push: { internalNotes: note } },
    { new: true },
  )
    .populate("assignedTo", "name email")
    .populate("internalNotes.authorId", "name email role");

  if (!conversation) {
    return res.status(404).json({ message: "Conversation not found" });
  }

  return res.status(200).json({
    data: {
      conversationId: String(conversation._id),
      internalNotes: sanitizeInternalNotes(conversation.internalNotes),
    },
  });
});

export const removeConversationNote = catchAsyncHandler(async (req, res) => {
  const workspaceCtx = ensureWorkspaceAccess(req, res);
  if (!workspaceCtx) return;

  const noteId = String(req.params.noteId || "").trim();
  if (!noteId) {
    return res.status(400).json({ message: "noteId is required" });
  }

  const query = { _id: req.params.id };
  if (!workspaceCtx.isSuperAdmin) {
    query.workspaceId = workspaceCtx.workspaceId;
  }

  const conversation = await Conversation.findOne(query);
  if (!conversation) {
    return res.status(404).json({ message: "Conversation not found" });
  }

  const note = (conversation.internalNotes || []).find(
    (item) => String(item?._id || "") === noteId,
  );
  if (!note) {
    return res.status(404).json({ message: "Note not found" });
  }

  const role = String(req.user?.role || "").toLowerCase();
  const isPrivileged =
    role === "owner" || role === "admin" || role === "super-admin";
  if (
    !isPrivileged &&
    String(note.authorId || "") !== String(req.user.id || "")
  ) {
    return res
      .status(403)
      .json({ message: "You can delete only your own note" });
  }

  conversation.internalNotes = (conversation.internalNotes || []).filter(
    (item) => String(item?._id || "") !== noteId,
  );
  await conversation.save();

  await conversation.populate("internalNotes.authorId", "name email role");

  return res.status(200).json({
    data: {
      conversationId: String(conversation._id),
      internalNotes: sanitizeInternalNotes(conversation.internalNotes),
    },
  });
});

export const setConversationTypingLock = catchAsyncHandler(async (req, res) => {
  const workspaceCtx = ensureWorkspaceAccess(req, res);
  if (!workspaceCtx) return;

  const isTyping = Boolean(req.body?.isTyping);
  const force = Boolean(req.body?.force);

  const query = { _id: req.params.id };
  if (!workspaceCtx.isSuperAdmin) {
    query.workspaceId = workspaceCtx.workspaceId;
  }

  const conversation = await Conversation.findOne(query).populate(
    "typingLock.lockedBy",
    "name email role",
  );
  if (!conversation) {
    return res.status(404).json({ message: "Conversation not found" });
  }

  const existingLock = conversation.typingLock || {};
  const active = isTypingLockActive(existingLock);
  const currentUserId = String(req.user?.id || "");
  const lockOwnerId = String(
    existingLock?.lockedBy?._id || existingLock?.lockedBy || "",
  );

  if (isTyping) {
    if (active && lockOwnerId && lockOwnerId !== currentUserId) {
      return res.status(409).json({
        message: "Conversation is currently locked by another agent",
        data: buildTypingLockPayload(conversation),
      });
    }

    conversation.typingLock = {
      lockedBy: req.user.id,
      lockedAt: new Date(),
      expiresAt: new Date(Date.now() + TYPING_LOCK_TTL_MS),
    };
  } else if (
    force ||
    !active ||
    !lockOwnerId ||
    lockOwnerId === currentUserId
  ) {
    conversation.typingLock = {
      lockedBy: null,
      lockedAt: null,
      expiresAt: null,
    };
  }

  await conversation.save();
  await conversation.populate("typingLock.lockedBy", "name email role");
  emitConversationLock(req, conversation);

  return res.status(200).json({
    data: buildTypingLockPayload(conversation),
  });
});

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = "uploads/";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "chat-" + uniqueSuffix + path.extname(file.originalname || ""));
  },
});

export const chatUpload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
});

export const uploadChatFile = catchAsyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;

  return res.status(200).json({
    message: "File uploaded successfully",
    data: {
      url: fileUrl,
      name: req.file.originalname,
      type: req.file.mimetype,
      size: req.file.size,
    },
  });
});
