import { state } from "./state.js";
import { normalizeId, getThreadKey } from "./utils.js";
import { refreshAssignment } from "./api.js";

export function loadSocketClient() {
  return new Promise((resolve, reject) => {
    if (window.io) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = state.options.apiHost + "/socket.io/socket.io.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load socket.io client"));
    document.head.appendChild(script);
  });
}

export async function connectSocket(handlers) {
  await loadSocketClient();
  if (!window.io) throw new Error("socket.io client is unavailable");

  state.socket = window.io(state.options.apiHost, {
    withCredentials: false,
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 10,
  });

  state.socket.on("join_success", () => {
    state.socketJoined = true;
  });

  state.socket.on("join_error", (payload) => {
    state.socketJoined = false;
    if (typeof handlers.onMessageError === "function") {
      handlers.onMessageError(payload);
    }
  });

  state.socket.on("connect", () => {
    state.socketStatus = "connected";
    state.socketJoined = false;
    if (typeof handlers.onSocketStatusChange === "function") {
      handlers.onSocketStatusChange(state.socketStatus);
    }
    if (state.visitorUserId) {
      state.socket.emit("join", {
        userId: state.visitorUserId,
        workspaceId: state.workspaceId,
        token: state.socketToken || undefined,
      });
    }
    console.log("ChatFlexWidget: Socket Connected", {
      userId: state.visitorUserId,
      workspaceId: state.workspaceId,
    });
  });

  state.socket.on("connect_error", (err) => {
    state.socketStatus = "error";
    state.socketJoined = false;
    if (typeof handlers.onSocketStatusChange === "function") {
      handlers.onSocketStatusChange(state.socketStatus);
    }
    console.error("ChatFlexWidget: Socket Connection Error", err);
  });

  state.socket.on("new_private_message", handlers.handleRealtimeMessage);
  state.socket.on("message_sent", handlers.handleRealtimeMessage);
  state.socket.on("message_updated", handlers.handleMessageUpdated);
  state.socket.on("message_deleted", handlers.handleMessageDeleted);
  state.socket.on("message_error", (payload) => {
    if (typeof handlers.onMessageError === "function") {
      handlers.onMessageError(payload);
    }
  });
  state.socket.on("unread_counts", (payload) => {
    if (typeof handlers.onUnreadCounts === "function") {
      handlers.onUnreadCounts(payload);
    }
  });

  state.socket.on("user_status_change", (payload) => {
    if (!payload) return;
    if (payload.status === "active" && !state.assignedAgentId) {
      refreshAssignment()
        .then(() => {
          if (typeof handlers.onAssignmentChange === "function") {
            handlers.onAssignmentChange();
          }
        })
        .catch(() => {});
    }
    if (
      normalizeId(payload.userId) === normalizeId(state.assignedAgentId) &&
      payload.status === "inactive"
    ) {
      state.assignedAgentId = "";
      refreshAssignment()
        .then(() => {
          if (typeof handlers.onAssignmentChange === "function") {
            handlers.onAssignmentChange();
          }
        })
        .catch(() => {});
    }
  });

  state.socket.on("typing_status_change", (payload) => {
    const threadKey = getThreadKey(state.visitorUserId, state.assignedAgentId);
    if (!threadKey || payload.threadKey !== threadKey) return;
    if (normalizeId(payload.userId) !== normalizeId(state.assignedAgentId))
      return;

    state.isAgentTyping = Boolean(payload.isTyping);
    handlers.renderTypingStatus();
  });

  state.socket.on("disconnect", () => {
    state.socketStatus = "disconnected";
    state.socketJoined = false;
    if (typeof handlers.onSocketStatusChange === "function") {
      handlers.onSocketStatusChange(state.socketStatus);
    }
    console.log("ChatFlexWidget: Socket Disconnected");
  });
}

export function emitTyping(isTyping) {
  if (!state.socket || !state.socket.connected || !state.assignedAgentId)
    return;

  if (state.typingStopTimer) {
    clearTimeout(state.typingStopTimer);
    state.typingStopTimer = null;
  }

  if (isTyping) {
    state.typingStopTimer = setTimeout(() => {
      emitTyping(false);
    }, 2000);
  }

  if (state.isLocalTyping === isTyping) return;

  state.isLocalTyping = isTyping;
  state.socket.emit(isTyping ? "typing_start" : "typing_stop", {
    senderId: state.visitorUserId,
    receiverId: state.assignedAgentId,
    workspaceId: state.workspaceId,
  });
}

export function emitPrivateMessage(content, attachments = []) {
  if (!state.socket || !state.socket.connected || !state.socketJoined) return;

  state.socket.emit("widget_message", {
    senderId: state.visitorUserId,
    visitorId: state.visitorId,
    conversationId: state.conversationId,
    senderName: state.options.visitorName,
    // Avoid stale receiver mismatch after reassignment; server resolves from conversation.
    content: content,
    attachments: attachments,
    role: "visitor",
    workspaceId: state.workspaceId,
  });
}

export function emitEditMessage(messageId, content) {
  if (!state.socket || !state.socket.connected) return;
  state.socket.emit("edit_message", {
    messageId,
    userId: state.visitorUserId,
    content,
  });
}

export function emitDeleteMessage(messageId) {
  if (!state.socket || !state.socket.connected) return;
  state.socket.emit("delete_message", {
    messageId,
    userId: state.visitorUserId,
  });
}
