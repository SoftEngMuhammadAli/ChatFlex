import { state } from "./state.js";

function buildAuthQuery() {
  const params = new URLSearchParams();
  if (state.options.apiKey) params.set("apiKey", state.options.apiKey);
  if (state.options.widgetId) params.set("widgetId", state.options.widgetId);
  if (state.options.widgetToken)
    params.set("widgetToken", state.options.widgetToken);
  if (state.options.visitorEmail)
    params.set("visitorEmail", state.options.visitorEmail);
  return params.toString();
}

export function buildAuthBody() {
  return {
    apiKey: state.options.apiKey || undefined,
    widgetId: state.options.widgetId || undefined,
    widgetToken: state.options.widgetToken || undefined,
    visitorEmail: state.options.visitorEmail || undefined,
  };
}

export function getStorageKey(suffix) {
  const identity = state.options.widgetId || state.options.apiKey || "public";
  return "chatflex_widget_" + identity + "_" + suffix;
}

export function getOrCreateVisitorId(uid) {
  const key = getStorageKey("visitor_id");
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const created = uid("visitor");
  localStorage.setItem(key, created);
  return created;
}

export async function request(path, config) {
  const url = state.options.apiHost + "/api/v1/widget" + path;
  const method = (config && config.method) || "GET";
  const body = (config && config.body) || null;

  const headers = (config && config.headers) || {
    "Content-Type": "application/json",
  };

  const fetchConfig = {
    method: method,
    headers: headers,
  };

  if (body) {
    if (headers["Content-Type"] === "application/json") {
      fetchConfig.body = JSON.stringify(body);
    } else {
      fetchConfig.body = body;
    }
  }

  const res = await fetch(url, fetchConfig);

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      json?.message ||
      json?.error?.message ||
      json?.error?.type ||
      "Widget request failed";
    throw new Error(message);
  }
  return json;
}

export async function uploadFile(file) {
  const formData = new FormData();
  formData.append("file", file);

  const auth = buildAuthBody();
  Object.keys(auth).forEach((key) => {
    if (auth[key]) formData.append(key, auth[key]);
  });
  formData.append("visitorId", state.visitorId);

  // When sending FormData, we must NOT set Content-Type manually
  return request("/upload", {
    method: "POST",
    headers: {}, // Remove Content-Type so browser sets it with boundary
    body: formData,
  });
}

export async function fetchHistory(pushMessage) {
  if (!state.conversationId) return;

  let query =
    "?" +
    buildAuthQuery() +
    "&visitorId=" +
    encodeURIComponent(state.visitorId);
  query +=
    "&conversationId=" + encodeURIComponent(String(state.conversationId || ""));
  if (state.lastMessageAt) {
    query += "&after=" + encodeURIComponent(state.lastMessageAt);
  }
  const result = await request("/direct-messages" + query);
  const items = (result && result.data) || [];
  items.forEach((msg) => {
    const senderId = String(msg.senderId || "");
    const receiverId = String(msg.receiverId || "");
    const visitorUserId = String(state.visitorUserId || "");
    const messageConversationId = String(msg.conversationId || "");
    const isInCurrentThread =
      messageConversationId &&
      messageConversationId === String(state.conversationId || "") &&
      visitorUserId &&
      (senderId === visitorUserId || receiverId === visitorUserId);
    if (!isInCurrentThread) return;

    // Update assigned agent when ownership changes.
    if (senderId && senderId !== visitorUserId) {
      state.assignedAgentId = senderId;
    } else if (receiverId && receiverId !== visitorUserId) {
      state.assignedAgentId = receiverId;
    }

    pushMessage({
      _id: msg._id,
      senderId,
      receiverId,
      senderType: senderId === visitorUserId ? "visitor" : "agent",
      content: msg.content,
      attachments: msg.attachments || [],
      createdAt: msg.createdAt,
    });
  });
}
export async function refreshAssignment() {
  const previousVisitorUserId = String(state.visitorUserId || "");
  const auth = buildAuthBody();
  const result = await request("/start", {
    method: "POST",
    body: {
      ...auth,
      visitorId: state.visitorId,
      metadata: state.options.metadata,
      department: state.options.selectedDepartment || state.options.metadata?.department || "",
      forceNewConversation: Boolean(state.forceNewConversation),
    },
  });

  const data = (result && result.data) || {};
  if (data.assignedAgentId || data.conversationId) {
    state.workspaceId = String(data.workspaceId || "");
    state.visitorUserId = String(data.visitorUserId || "");
    state.socketToken = String(data.socketToken || "");
    state.assignedAgentId = String(data.assignedAgentId || "");
    state.conversationId = String(data.conversationId || "");
    state.options.selectedDepartment = String(data.department || state.options.selectedDepartment || "");
    state.forceNewConversation = false;

    if (
      state.socket?.connected &&
      state.visitorUserId &&
      state.visitorUserId !== previousVisitorUserId
    ) {
      state.socket.emit("join", {
        userId: state.visitorUserId,
        workspaceId: state.workspaceId,
        token: state.socketToken || undefined,
      });
    }
    return true;
  }
  return false;
}

export async function updateVisitorProfile(metadata) {
  const auth = buildAuthBody();
  return request("/visitor", {
    method: "PUT",
    body: {
      ...auth,
      visitorId: state.visitorId,
      metadata,
    },
  });
}

export async function leaveConversation(
  conversationIdOverride = "",
  visitorIdOverride = "",
) {
  const targetConversationId = String(
    conversationIdOverride || state.conversationId || "",
  ).trim();
  const targetVisitorId = String(visitorIdOverride || state.visitorId || "").trim();
  if (!targetConversationId) return true;

  const auth = buildAuthBody();
  await request(
    "/conversations/" + encodeURIComponent(targetConversationId) + "/leave",
    {
      method: "POST",
      body: {
        ...auth,
        visitorId: targetVisitorId,
      },
    },
  );

  return true;
}

export async function postVisitorMessageToConversation(
  content,
  attachments = [],
) {
  if (!state.conversationId) {
    throw new Error("Conversation is not initialized");
  }

  const auth = buildAuthBody();
  return request(
    "/conversations/" +
      encodeURIComponent(state.conversationId) +
      "/messages",
    {
      method: "POST",
      body: {
        ...auth,
        visitorId: state.visitorId,
        visitorEmail: state.options.visitorEmail || undefined,
        content,
        attachments: Array.isArray(attachments) ? attachments : [],
      },
    },
  );
}

export async function editVisitorMessageInConversation(messageId, content) {
  if (!state.conversationId) {
    throw new Error("Conversation is not initialized");
  }
  const auth = buildAuthBody();
  return request(
    "/conversations/" +
      encodeURIComponent(state.conversationId) +
      "/messages/" +
      encodeURIComponent(messageId),
    {
      method: "PATCH",
      body: {
        ...auth,
        visitorId: state.visitorId,
        visitorEmail: state.options.visitorEmail || undefined,
        content,
      },
    },
  );
}

export async function deleteVisitorMessageInConversation(messageId) {
  if (!state.conversationId) {
    throw new Error("Conversation is not initialized");
  }
  const auth = buildAuthBody();
  return request(
    "/conversations/" +
      encodeURIComponent(state.conversationId) +
      "/messages/" +
      encodeURIComponent(messageId),
    {
      method: "DELETE",
      body: {
        ...auth,
        visitorId: state.visitorId,
        visitorEmail: state.options.visitorEmail || undefined,
      },
    },
  );
}
