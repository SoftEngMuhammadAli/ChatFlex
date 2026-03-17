import { state } from "./state.js";
import { uid, playWidgetMessageSound } from "./utils.js";
import {
  renderMessages,
  renderChatModeStatus,
  renderFabUnreadBadge,
} from "./ui.js";

export function pushMessage(message) {
  if (!message) return;
  const hasText = Boolean(String(message.content || "").trim());
  const hasAttachments =
    Array.isArray(message.attachments) && message.attachments.length > 0;
  if (!hasText && !hasAttachments) return;
  const exists = state.messages.some((item) => item._id === message._id);
  if (exists) return;
  state.messages.push(message);
  if (message.createdAt) state.lastMessageAt = message.createdAt;
  state.isAgentTyping = false;
  renderMessages();
  renderChatModeStatus();
}

function normalizeAttachmentKey(list) {
  const normalized = Array.isArray(list)
    ? list.map((item) => ({
        url: String(item?.url || ""),
        name: String(item?.name || ""),
        type: String(item?.type || ""),
        size: Number(item?.size || 0),
      }))
    : [];
  return JSON.stringify(normalized);
}

function reconcileOptimisticOutgoingMessage(message) {
  if (!message || message.senderType !== "visitor") return;
  const targetAttachmentKey = normalizeAttachmentKey(message.attachments);
  const optimisticIndex = state.messages.findIndex(
    (item) =>
      item &&
      item.isOptimistic === true &&
      item.senderType === "visitor" &&
      String(item.content || "") === String(message.content || "") &&
      normalizeAttachmentKey(item.attachments) === targetAttachmentKey,
  );
  if (optimisticIndex === -1) return;
  state.messages.splice(optimisticIndex, 1);
}

export function handleRealtimeMessage(raw) {
  const senderId = String(raw && raw.senderId ? raw.senderId : "");
  const rawRole = String(raw?.role || "").toLowerCase();
  const inferredSenderType =
    rawRole === "ai"
      ? "ai"
      : senderId === state.visitorUserId
        ? "visitor"
        : "agent";
  const msg = {
    _id: raw && raw._id ? String(raw._id) : uid("msg"),
    senderId,
    receiverId: String(raw && raw.receiverId ? raw.receiverId : ""),
    conversationId: String(raw && raw.conversationId ? raw.conversationId : ""),
    senderType: inferredSenderType,
    content: raw && raw.content ? String(raw.content) : "",
    attachments: Array.isArray(raw?.attachments) ? raw.attachments : [],
    createdAt:
      (raw && (raw.timestamp || raw.createdAt)) || new Date().toISOString(),
  };

  const hasText = Boolean(msg.content.trim());
  const hasAttachments =
    Array.isArray(msg.attachments) && msg.attachments.length > 0;
  if (!hasText && !hasAttachments) return;
  reconcileOptimisticOutgoingMessage(msg);
  const isInActiveConversation =
    !state.conversationId ||
    !msg.conversationId ||
    msg.conversationId === state.conversationId;
  const isVisitorParticipant =
    msg.senderId === state.visitorUserId ||
    msg.receiverId === state.visitorUserId;
  const isInCurrentThread = isInActiveConversation && isVisitorParticipant;

  if (isInCurrentThread) {
    // Keep assignment in sync when staff member changes.
    if (msg.senderId && msg.senderId !== state.visitorUserId) {
      state.assignedAgentId = msg.senderId;
    } else if (msg.receiverId && msg.receiverId !== state.visitorUserId) {
      state.assignedAgentId = msg.receiverId;
    }
    pushMessage(msg);
  }
  if (!isInCurrentThread) return;

  const isOutgoing = msg.senderId === state.visitorUserId;
  if (isOutgoing) {
    playWidgetMessageSound("send");
    return;
  }

  playWidgetMessageSound("receive");
  const panelVisible = state.elements?.panel?.classList.contains("cfw-visible");
  if (!panelVisible) {
    state.unreadCount = Number(state.unreadCount || 0) + 1;
    renderFabUnreadBadge();
  }
}

export function handleMessageUpdated(raw) {
  const messageId = String(raw?._id || "");
  if (!messageId) return;
  let changed = false;
  state.messages = state.messages.map((msg) => {
    if (String(msg?._id) !== messageId) return msg;
    changed = true;
    return {
      ...msg,
      content: String(raw?.content || msg.content || ""),
      attachments: Array.isArray(raw?.attachments)
        ? raw.attachments
        : Array.isArray(msg.attachments)
          ? msg.attachments
          : [],
      updatedAt: raw?.updatedAt || new Date().toISOString(),
      isOptimistic: false,
    };
  });
  if (changed) {
    renderMessages();
    renderChatModeStatus();
  }
}

export function handleMessageDeleted(raw) {
  const messageId = String(raw?.messageId || "");
  if (!messageId) return;
  const before = state.messages.length;
  state.messages = state.messages.filter(
    (msg) => String(msg?._id) !== messageId,
  );
  if (state.messages.length !== before) {
    renderMessages();
    renderChatModeStatus();
  }
}
