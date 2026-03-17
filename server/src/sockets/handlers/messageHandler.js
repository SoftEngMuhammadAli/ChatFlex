import { Message, Conversation } from "../../models/index.js";
import { users, typingByThread } from "../socketStore.js";
import {
  toId,
  isObjectId,
  getThreadKey,
  normalizeSenderRole,
} from "../socketUtils.js";
import { emitUnreadCounts, emitTypingStatus } from "../socketEmitters.js";
import { executeAutomationRules } from "../../services/automation.service.js";
import { dispatchIntegrationEvent } from "../../services/integration.service.js";

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

const buildMessageSocketPayload = (message) => ({
  _id: String(message._id),
  senderId: toId(message.senderId),
  receiverId: toId(message.receiverId),
  content: message.content || "",
  attachments: sanitizeAttachments(message.attachments),
  conversationId: toId(message.conversationId),
  workspaceId: toId(message.workspaceId),
  senderType: message.senderType,
  createdAt: message.createdAt,
  updatedAt: message.updatedAt,
});

const resolveWorkspaceForSocketEvent = (socket, requestedWorkspaceId) => {
  const socketWorkspaceId = toId(socket.workspaceId);
  const payloadWorkspaceId = toId(requestedWorkspaceId);

  if (socketWorkspaceId && payloadWorkspaceId && socketWorkspaceId !== payloadWorkspaceId) {
    return { denied: true, workspaceId: socketWorkspaceId };
  }

  return { denied: false, workspaceId: socketWorkspaceId || payloadWorkspaceId };
};

/**
 * Visitor (widget) -> Agent message
 */
export const handleWidgetMessage = async (io, socket, payload) => {
  const {
    senderId,
    receiverId,
    conversationId,
    content,
    senderName,
    workspaceId,
    visitorId,
    attachments,
  } = payload || {};

  try {
    const socketUserId = toId(socket.userId);
    const normalizedSenderId = toId(senderId);
    let normalizedReceiverId = toId(receiverId);
    let normalizedConversationId = toId(conversationId);

    if (!socketUserId || normalizedSenderId !== socketUserId) {
      socket.emit("message_error", { error: "Sender mismatch in widget message" });
      return;
    }

    const workspaceResolution = resolveWorkspaceForSocketEvent(socket, workspaceId);
    if (workspaceResolution.denied) {
      socket.emit("message_error", { error: "Workspace mismatch" });
      return;
    }

    const normalizedWorkspaceId = toId(workspaceResolution.workspaceId);
    const normalizedAttachments = sanitizeAttachments(attachments);
    const normalizedContent = String(content || "").trim();
    const fallbackContent =
      normalizedAttachments.length > 1
        ? `[Files: ${normalizedAttachments.length}]`
        : normalizedAttachments.length === 1
          ? `[File: ${normalizedAttachments[0]?.name || "Attachment"}]`
          : "";

    if (!normalizedSenderId || (!normalizedContent && normalizedAttachments.length === 0)) {
      socket.emit("message_error", { error: "Invalid widget message payload" });
      return;
    }

    let conversation = null;

    if (isObjectId(normalizedConversationId)) {
      conversation = await Conversation.findOne({
        _id: normalizedConversationId,
        ...(isObjectId(normalizedWorkspaceId) ? { workspaceId: normalizedWorkspaceId } : {}),
      });

      if (!conversation) {
        socket.emit("message_error", { error: "Conversation not found" });
        return;
      }

      const conversationAgentId = toId(conversation.assignedTo || conversation.assignedAgent);
      if (toId(conversation.visitorUserId) !== normalizedSenderId) {
        socket.emit("message_error", { error: "Conversation participant mismatch" });
        return;
      }

      normalizedConversationId = toId(conversation._id);
      // Trust current conversation assignment over any stale client-side receiver id.
      if (conversationAgentId) {
        normalizedReceiverId = conversationAgentId;
      } else if (!normalizedReceiverId) {
        normalizedReceiverId = conversationAgentId;
      }

      let changed = false;
      if (normalizedReceiverId && toId(conversation.assignedTo) !== normalizedReceiverId) {
        conversation.assignedTo = normalizedReceiverId;
        changed = true;
      }
      if (conversation.status === "resolved") {
        conversation.status = "open";
        changed = true;
      }
      conversation.lastMessageAt = new Date();
      changed = true;
      if (changed) {
        await conversation.save();
      }
    }

    if (!conversation) {
      conversation = await Conversation.findOne({
        visitorUserId: normalizedSenderId,
        status: { $in: ["open", "pending"] },
        ...(normalizedReceiverId ? { assignedTo: normalizedReceiverId } : {}),
        ...(isObjectId(normalizedWorkspaceId) ? { workspaceId: normalizedWorkspaceId } : {}),
      }).sort({ updatedAt: -1 });

      if (conversation) {
        normalizedConversationId = toId(conversation._id);
        if (!normalizedReceiverId) {
          normalizedReceiverId = toId(conversation.assignedTo || conversation.assignedAgent);
        }
        if (normalizedReceiverId && toId(conversation.assignedTo) !== normalizedReceiverId) {
          conversation.assignedTo = normalizedReceiverId;
        }
        if (conversation.status === "resolved") {
          conversation.status = "open";
        }
        conversation.lastMessageAt = new Date();
        await conversation.save();
      }
    }

    if (!normalizedReceiverId) {
      socket.emit("message_error", { error: "No assigned agent available" });
      return;
    }

    if (!conversation && normalizedConversationId) {
      socket.emit("message_error", { error: "Conversation not found" });
      return;
    }

    const message = await Message.create({
      senderId: normalizedSenderId,
      receiverId: normalizedReceiverId,
      content: normalizedContent || fallbackContent,
      attachments: normalizedAttachments,
      senderType: "visitor",
      ...(isObjectId(normalizedConversationId)
        ? { conversationId: normalizedConversationId }
        : {}),
      ...(isObjectId(normalizedWorkspaceId) ? { workspaceId: normalizedWorkspaceId } : {}),
    });

    if (conversation && isObjectId(normalizedWorkspaceId)) {
      await executeAutomationRules({
        workspaceId: normalizedWorkspaceId,
        trigger: "visitor_message",
        conversation,
        message,
        senderType: "visitor",
        actorId: normalizedSenderId,
      });
    }

    if (isObjectId(normalizedWorkspaceId)) {
      await dispatchIntegrationEvent({
        workspaceId: normalizedWorkspaceId,
        event: "new_message",
        payload: {
          conversationId: toId(conversation?._id || normalizedConversationId),
          messageId: String(message._id || ""),
          senderType: "visitor",
          message: String(message.content || ""),
          source: "socket_widget",
        },
      });
    }

    const messageData = {
      _id: String(message._id),
      senderId: normalizedSenderId,
      senderName: senderName || "Visitor",
      receiverId: normalizedReceiverId,
      visitorId: visitorId || "",
      conversationId: isObjectId(normalizedConversationId) ? normalizedConversationId : "",
      content: message.content,
      attachments: sanitizeAttachments(message.attachments),
      role: "visitor",
      workspaceId: isObjectId(normalizedWorkspaceId) ? normalizedWorkspaceId : "",
      timestamp: message.createdAt,
    };

    const receiverSockets = users.get(normalizedReceiverId);
    if (receiverSockets?.size) {
      for (const socketId of receiverSockets) {
        io.to(socketId).emit("new_private_message", messageData);
      }
    }

    socket.emit("message_sent", messageData);
    await emitUnreadCounts({
      io,
      userId: normalizedReceiverId,
      workspaceId: normalizedWorkspaceId,
    });

    const threadKey = getThreadKey(normalizedSenderId, normalizedReceiverId);
    if (threadKey && typingByThread.has(threadKey)) {
      const typers = typingByThread.get(threadKey);
      if (typers?.has(normalizedSenderId)) {
        typers.delete(normalizedSenderId);
        emitTypingStatus({
          io,
          senderId: normalizedSenderId,
          receiverId: normalizedReceiverId,
          isTyping: false,
        });
      }
      if (!typers || typers.size === 0) typingByThread.delete(threadKey);
    }
  } catch (error) {
    console.error("Socket Error (widget_message):", error);
    socket.emit("message_error", { error: "Failed to save widget message" });
  }
};

/**
 * Agent <-> Visitor private message
 */
export const handlePrivateMessage = async (io, socket, payload) => {
  const {
    senderId,
    receiverId,
    content,
    senderName,
    role,
    workspaceId,
    attachments,
    conversationId,
  } = payload || {};

  try {
    const socketUserId = toId(socket.userId);
    const normalizedSenderId = toId(senderId);
    const normalizedReceiverId = toId(receiverId);
    if (!socketUserId || normalizedSenderId !== socketUserId) {
      socket.emit("message_error", { error: "Sender mismatch in private message" });
      return;
    }

    const workspaceResolution = resolveWorkspaceForSocketEvent(
      socket,
      workspaceId,
    );
    if (workspaceResolution.denied) {
      socket.emit("message_error", { error: "Workspace mismatch" });
      return;
    }
    const normalizedWorkspaceId = toId(workspaceResolution.workspaceId);
    const normalizedConversationId = toId(conversationId);
    const normalizedRole = normalizeSenderRole(role);
    const normalizedAttachments = sanitizeAttachments(attachments);
    const normalizedContent = String(content || "").trim();
    const fallbackContent =
      normalizedAttachments.length > 1
        ? `[Files: ${normalizedAttachments.length}]`
        : normalizedAttachments.length === 1
          ? `[File: ${normalizedAttachments[0]?.name || "Attachment"}]`
          : "";

    if (
      !normalizedSenderId ||
      !normalizedReceiverId ||
      (!normalizedContent && normalizedAttachments.length === 0)
    ) {
      socket.emit("message_error", { error: "Invalid message payload" });
      return;
    }

    const messagePayload = {
      senderId: normalizedSenderId,
      receiverId: normalizedReceiverId,
      content: normalizedContent || fallbackContent,
      attachments: normalizedAttachments,
      senderType: normalizedRole,
    };

    if (isObjectId(normalizedWorkspaceId)) {
      messagePayload.workspaceId = normalizedWorkspaceId;
    }
    let resolvedConversationId = isObjectId(normalizedConversationId)
      ? normalizedConversationId
      : "";
    let visitorConversation = null;

    // If agent replies, resolve active visitor conversation and keep assignment in sync.
    if (normalizedRole === "agent") {
      visitorConversation = resolvedConversationId
        ? await Conversation.findOne({
            _id: resolvedConversationId,
            ...(isObjectId(normalizedWorkspaceId)
              ? { workspaceId: normalizedWorkspaceId }
              : {}),
          })
        : await Conversation.findOne({
            visitorUserId: normalizedReceiverId,
            status: { $in: ["open", "pending"] },
            ...(isObjectId(normalizedWorkspaceId)
              ? { workspaceId: normalizedWorkspaceId }
              : {}),
          }).sort({ updatedAt: -1 });

      if (
        visitorConversation &&
        toId(visitorConversation.visitorUserId) !== normalizedReceiverId
      ) {
        socket.emit("message_error", {
          error: "Conversation participant mismatch",
        });
        return;
      }
      if (resolvedConversationId && !visitorConversation) {
        socket.emit("message_error", { error: "Conversation not found" });
        return;
      }

      if (visitorConversation && !resolvedConversationId) {
        resolvedConversationId = toId(visitorConversation._id);
      }
    }

    if (isObjectId(resolvedConversationId)) {
      messagePayload.conversationId = resolvedConversationId;
    }

    const message = await Message.create(messagePayload);

    if (visitorConversation) {
      let changed = false;
      if (toId(visitorConversation.assignedTo) !== normalizedSenderId) {
        visitorConversation.assignedTo = normalizedSenderId;
        changed = true;
      }
      if (
        toId(visitorConversation.typingLock?.lockedBy) === normalizedSenderId
      ) {
        visitorConversation.typingLock = {
          lockedBy: null,
          lockedAt: null,
          expiresAt: null,
        };
        changed = true;
      }
      visitorConversation.lastMessageAt = new Date();
      changed = true;
      if (changed) {
        await visitorConversation.save();
        const workspaceId = toId(
          visitorConversation.workspaceId || normalizedWorkspaceId,
        );
        const lockPayload = {
          conversationId: toId(visitorConversation._id),
          isActive: false,
          lockedBy: null,
          lockedAt: null,
          expiresAt: null,
        };
        if (workspaceId) {
          io.to(`workspace:${workspaceId}`).emit(
            "conversation_lock_updated",
            lockPayload,
          );
        } else {
          io.emit("conversation_lock_updated", lockPayload);
        }
      }
    }

    if (visitorConversation && isObjectId(normalizedWorkspaceId)) {
      await executeAutomationRules({
        workspaceId: normalizedWorkspaceId,
        trigger: normalizedRole === "agent" ? "agent_message" : "visitor_message",
        conversation: visitorConversation,
        message,
        senderType: normalizedRole,
        actorId: normalizedSenderId,
      });
    }

    if (isObjectId(normalizedWorkspaceId)) {
      await dispatchIntegrationEvent({
        workspaceId: normalizedWorkspaceId,
        event: "new_message",
        payload: {
          conversationId: resolvedConversationId,
          messageId: String(message._id || ""),
          senderType: normalizedRole,
          message: String(message.content || ""),
          source: "socket_private",
        },
      });
    }

    const messageData = {
      _id: String(message._id),
      senderId: normalizedSenderId,
      senderName: senderName || "User",
      receiverId: normalizedReceiverId,
      content: message.content,
      attachments: sanitizeAttachments(message.attachments),
      role: normalizedRole,
      workspaceId: isObjectId(normalizedWorkspaceId)
        ? normalizedWorkspaceId
        : "",
      conversationId: isObjectId(resolvedConversationId)
        ? resolvedConversationId
        : "",
      timestamp: message.createdAt,
    };

    const receiverSockets = users.get(normalizedReceiverId);
    if (receiverSockets?.size) {
      for (const socketId of receiverSockets) {
        io.to(socketId).emit("new_private_message", messageData);
      }
    }

    socket.emit("message_sent", messageData);
    await emitUnreadCounts({
      io,
      userId: normalizedReceiverId,
      workspaceId: normalizedWorkspaceId,
    });

    const threadKey = getThreadKey(normalizedSenderId, normalizedReceiverId);
    if (threadKey && typingByThread.has(threadKey)) {
      const typers = typingByThread.get(threadKey);
      if (typers?.has(normalizedSenderId)) {
        typers.delete(normalizedSenderId);
        emitTypingStatus({
          io,
          senderId: normalizedSenderId,
          receiverId: normalizedReceiverId,
          isTyping: false,
        });
      }
      if (!typers || typers.size === 0) typingByThread.delete(threadKey);
    }
  } catch (error) {
    console.error("❌ Socket Error (private_message):", error);
    socket.emit("message_error", { error: "Failed to save message" });
  }
};

export const handleMarkThreadRead = async (io, socket, { otherUserId }) => {
  try {
    const currentUserId = toId(socket.userId);
    const normalizedOtherUserId = toId(otherUserId);

    if (!isObjectId(currentUserId) || !isObjectId(normalizedOtherUserId))
      return;

    await Message.updateMany(
      {
        senderId: normalizedOtherUserId,
        receiverId: currentUserId,
        readAt: null,
        ...(socket.workspaceId ? { workspaceId: toId(socket.workspaceId) } : {}),
      },
      { $set: { readAt: new Date() } },
    );

    await emitUnreadCounts({
      io,
      userId: currentUserId,
      workspaceId: toId(socket.workspaceId),
    });
  } catch (error) {
    console.error("❌ Socket Error (mark_thread_read):", error);
    socket.emit("message_error", { error: "Failed to update read status" });
  }
};

export const handleEditMessage = async (io, socket, payload) => {
  try {
    const messageId = toId(payload?.messageId);
    const socketUserId = toId(socket.userId);
    const editorId = toId(payload?.userId || socketUserId);
    const newContent = String(payload?.content || "").trim();

    if (!messageId || !editorId || !newContent) {
      socket.emit("message_error", { error: "Invalid edit payload" });
      return;
    }
    if (!socketUserId || editorId !== socketUserId) {
      socket.emit("message_error", { error: "Sender mismatch in edit message" });
      return;
    }

    const message = await Message.findOne({
      _id: messageId,
      ...(socket.workspaceId ? { workspaceId: toId(socket.workspaceId) } : {}),
    });
    if (!message) {
      socket.emit("message_error", { error: "Message not found" });
      return;
    }

    if (toId(message.senderId) !== editorId) {
      socket.emit("message_error", {
        error: "Not allowed to edit this message",
      });
      return;
    }

    message.content = newContent;
    await message.save();

    const data = buildMessageSocketPayload(message);
    const participants = [
      toId(message.senderId),
      toId(message.receiverId),
    ].filter(Boolean);
    participants.forEach((userId) =>
      io.to(userId).emit("message_updated", data),
    );
  } catch (error) {
    console.error("Socket Error (edit_message):", error);
    socket.emit("message_error", { error: "Failed to edit message" });
  }
};

export const handleDeleteMessage = async (io, socket, payload) => {
  try {
    const messageId = toId(payload?.messageId);
    const socketUserId = toId(socket.userId);
    const requesterId = toId(payload?.userId || socketUserId);

    if (!messageId || !requesterId) {
      socket.emit("message_error", { error: "Invalid delete payload" });
      return;
    }
    if (!socketUserId || requesterId !== socketUserId) {
      socket.emit("message_error", {
        error: "Sender mismatch in delete message",
      });
      return;
    }

    const message = await Message.findOne({
      _id: messageId,
      ...(socket.workspaceId ? { workspaceId: toId(socket.workspaceId) } : {}),
    });
    if (!message) {
      socket.emit("message_error", { error: "Message not found" });
      return;
    }

    if (toId(message.senderId) !== requesterId) {
      socket.emit("message_error", {
        error: "Not allowed to delete this message",
      });
      return;
    }

    const senderId = toId(message.senderId);
    const receiverId = toId(message.receiverId);
    await Message.deleteOne({ _id: messageId });

    const data = {
      messageId,
      senderId,
      receiverId,
    };
    [senderId, receiverId]
      .filter(Boolean)
      .forEach((userId) => io.to(userId).emit("message_deleted", data));
  } catch (error) {
    console.error("Socket Error (delete_message):", error);
    socket.emit("message_error", { error: "Failed to delete message" });
  }
};

