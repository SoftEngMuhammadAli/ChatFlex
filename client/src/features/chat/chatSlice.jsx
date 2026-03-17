import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../api/axios";

const initialState = {
  conversations: [],
  activeConversation: null,
  messages: [],
  aiMessages: [],
  aiConversationId: null,
  directUsers: [],
  directMessagesByUser: {},
  unreadCountsByUser: {},
  totalUnread: 0,
  latestMessageByUser: {},
  activeDirectUserId: null,
  aiSettings: null,
  aiSummaryByConversation: {},
  aiSuggestionsByConversation: {},
  loading: false,
  error: null,
};

// Fetch all conversations for the workspace
export const fetchConversations = createAsyncThunk(
  "chat/fetchConversations",
  async (filters = {}, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.get("/chat/conversations", {
        params: filters,
      });
      return data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch conversations",
      );
    }
  },
);

// Fetch messages for a specific conversation
export const fetchMessages = createAsyncThunk(
  "chat/fetchMessages",
  async (conversationId, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.get(
        `/chat/conversations/${conversationId}/messages`,
      );
      return data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch messages",
      );
    }
  },
);

// Send a message (as an agent)
export const sendMessage = createAsyncThunk(
  "chat/sendMessage",
  async ({ conversationId, content }, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.post(
        `/chat/conversations/${conversationId}/messages`,
        { content },
      );
      return data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to send message",
      );
    }
  },
);

export const assignConversation = createAsyncThunk(
  "chat/assignConversation",
  async ({ conversationId, userId }, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.patch(
        `/chat/conversations/${conversationId}/assign`,
        { userId },
      );
      return data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to assign conversation",
      );
    }
  },
);

export const updateConversationStatus = createAsyncThunk(
  "chat/updateConversationStatus",
  async ({ conversationId, status }, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.patch(
        `/chat/conversations/${conversationId}/status`,
        { status },
      );
      return data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to update conversation status",
      );
    }
  },
);

export const updateConversationTags = createAsyncThunk(
  "chat/updateConversationTags",
  async ({ conversationId, tags }, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.patch(
        `/chat/conversations/${conversationId}/tags`,
        { tags },
      );
      return data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to update conversation tags",
      );
    }
  },
);

export const addConversationNote = createAsyncThunk(
  "chat/addConversationNote",
  async ({ conversationId, content }, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.post(
        `/chat/conversations/${conversationId}/notes`,
        { content },
      );
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to add note");
    }
  },
);

export const removeConversationNote = createAsyncThunk(
  "chat/removeConversationNote",
  async ({ conversationId, noteId }, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.delete(
        `/chat/conversations/${conversationId}/notes/${noteId}`,
      );
      return data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to remove note",
      );
    }
  },
);

export const setConversationTypingLock = createAsyncThunk(
  "chat/setConversationTypingLock",
  async ({ conversationId, isTyping }, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.patch(
        `/chat/conversations/${conversationId}/typing-lock`,
        { isTyping },
      );
      return data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data || err.response?.data?.message || "Failed to set lock",
      );
    }
  },
);

export const fetchWorkspaceAISettings = createAsyncThunk(
  "chat/fetchWorkspaceAISettings",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.get("/ai/settings");
      return data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch AI settings",
      );
    }
  },
);

export const updateWorkspaceAISettings = createAsyncThunk(
  "chat/updateWorkspaceAISettings",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.put("/ai/settings", payload);
      return data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to update AI settings",
      );
    }
  },
);

export const fetchConversationAISummary = createAsyncThunk(
  "chat/fetchConversationAISummary",
  async (conversationId, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.get(
        `/ai/conversations/${conversationId}/summary`,
      );
      return data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch AI summary",
      );
    }
  },
);

export const fetchConversationAISuggestions = createAsyncThunk(
  "chat/fetchConversationAISuggestions",
  async (conversationId, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.get(
        `/ai/conversations/${conversationId}/suggestions`,
      );
      return data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch AI suggestions",
      );
    }
  },
);

// AI Response request
export const getAIResponse = createAsyncThunk(
  "chat/getAIResponse",
  async ({ message, conversationId }, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.post("/ai/respond", {
        message,
        conversationId,
      });
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "AI Error");
    }
  },
);

// Fetch all messages for an AI conversation
export const fetchAIMessages = createAsyncThunk(
  "chat/fetchAIMessages",
  async (conversationId, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.get(
        `/ai/conversations/${conversationId}/messages`,
      );
      return { conversationId, messages: data.data };
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch AI messages",
      );
    }
  },
);

// Fetch latest AI conversation for the current user
export const fetchLatestAIConversation = createAsyncThunk(
  "chat/fetchLatestAIConversation",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.get("/ai/conversations/latest");
      return data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch latest AI conversation",
      );
    }
  },
);

// Fetch direct messages with a specific user
export const fetchDirectMessages = createAsyncThunk(
  "chat/fetchDirectMessages",
  async (userId, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.get(`/direct-messages/${userId}`);
      return { userId, messages: data.data };
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch direct messages",
      );
    }
  },
);

// Fetch list of users with direct message history
export const fetchDirectMessageUsers = createAsyncThunk(
  "chat/fetchDirectMessageUsers",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.get("/direct-messages");
      return data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch chat users",
      );
    }
  },
);

export const fetchUnreadDirectCounts = createAsyncThunk(
  "chat/fetchUnreadDirectCounts",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.get(
        "/direct-messages/unread-counts",
      );
      return data.data || { total: 0, bySender: {} };
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch unread counts",
      );
    }
  },
);

export const editDirectMessage = createAsyncThunk(
  "chat/editDirectMessage",
  async ({ messageId, content }, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.patch(
        `/direct-messages/message/${messageId}`,
        { content },
      );
      return data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to edit message",
      );
    }
  },
);

export const deleteDirectMessage = createAsyncThunk(
  "chat/deleteDirectMessage",
  async ({ messageId }, { rejectWithValue }) => {
    try {
      await axiosInstance.delete(`/direct-messages/message/${messageId}`);
      return { messageId };
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to delete message",
      );
    }
  },
);

const normalizeId = (value) => (value ? String(value) : "");

const upsertLatestMessage = (state, userId, message) => {
  if (!userId || !message) return;
  const senderId = normalizeId(message.senderId);
  const isPeerSender = senderId === normalizeId(userId);
  state.latestMessageByUser[userId] = {
    senderId,
    senderName: isPeerSender ? message.senderName || "Visitor" : "You",
    content: message.content || "",
    createdAt:
      message.createdAt || message.timestamp || new Date().toISOString(),
  };
};

const recomputeUnreadTotal = (state) => {
  state.totalUnread = Object.values(state.unreadCountsByUser).reduce(
    (sum, count) => sum + Number(count || 0),
    0,
  );
};

const upsertConversation = (state, nextConversation) => {
  if (!nextConversation?._id) return;
  const nextId = String(nextConversation._id);
  const index = state.conversations.findIndex(
    (item) => String(item?._id) === nextId,
  );
  if (index === -1) {
    state.conversations.unshift(nextConversation);
    return;
  }
  state.conversations[index] = {
    ...state.conversations[index],
    ...nextConversation,
  };
};

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    setActiveConversation: (state, action) => {
      state.activeConversation = action.payload;
    },
    clearChatError: (state) => {
      state.error = null;
    },
    setAIConversationId: (state, action) => {
      state.aiConversationId = action.payload;
    },
    setActiveDirectUser: (state, action) => {
      const userId = action.payload;
      state.activeDirectUserId = userId;
      state.messages = state.directMessagesByUser[userId] || [];
      if (userId) {
        state.unreadCountsByUser[userId] = 0;
        recomputeUnreadTotal(state);
      }
      // If we are switching to a direct user, we clear activeConversation to avoid confusion
      // unless we want to track both separately. For simplicity, we'll keep one active target.
      state.activeConversation = null;
    },
    addLocalMessage: (state, action) => {
      state.aiMessages.push(action.payload);
      if (!state.activeDirectUserId) {
        state.messages = state.aiMessages;
      }
    },
    addMessage: (state, action) => {
      const payload = action.payload || {};
      const message = payload.message || payload;
      const userId = payload.userId;
      const currentUserId = normalizeId(payload.currentUserId);

      if (!message) return;

      if (userId) {
        const existingMessages = state.directMessagesByUser[userId] || [];
        const exists = existingMessages.find((m) => m._id === message._id);

        if (!exists) {
          const updatedMessages = [...existingMessages, message];
          state.directMessagesByUser[userId] = updatedMessages;
          if (state.activeDirectUserId === userId) {
            state.messages = updatedMessages;
            state.unreadCountsByUser[userId] = 0;
          }
          const senderId = normalizeId(message.senderId);
          if (
            senderId &&
            senderId !== currentUserId &&
            state.activeDirectUserId !== userId
          ) {
            state.unreadCountsByUser[userId] =
              Number(state.unreadCountsByUser[userId] || 0) + 1;
          }
          upsertLatestMessage(state, userId, message);
          recomputeUnreadTotal(state);
        }
        return;
      }

      const exists = state.aiMessages.find((m) => m._id === message._id);
      if (!exists) {
        state.aiMessages.push(message);
        if (!state.activeDirectUserId) {
          state.messages = state.aiMessages;
        }
      }
    },
    setUnreadCounts: (state, action) => {
      const payload = action.payload || {};
      state.unreadCountsByUser = { ...(payload.bySender || {}) };
      state.totalUnread = Number(payload.total || 0);
    },
    updateMessageLocal: (state, action) => {
      const message = action.payload;
      if (!message?._id) return;
      const messageId = String(message._id);

      const updateList = (list = []) =>
        list.map((item) => (String(item?._id) === messageId ? { ...item, ...message } : item));

      Object.keys(state.directMessagesByUser).forEach((userId) => {
        state.directMessagesByUser[userId] = updateList(
          state.directMessagesByUser[userId],
        );
      });
      state.messages = updateList(state.messages);
    },
    deleteMessageLocal: (state, action) => {
      const messageId = String(action.payload?.messageId || "");
      if (!messageId) return;
      const removeFromList = (list = []) =>
        list.filter((item) => String(item?._id) !== messageId);

      Object.keys(state.directMessagesByUser).forEach((userId) => {
        state.directMessagesByUser[userId] = removeFromList(
          state.directMessagesByUser[userId],
        );
      });
      state.messages = removeFromList(state.messages);
    },
    setConversationLockLocal: (state, action) => {
      const payload = action.payload || {};
      const conversationId = String(payload.conversationId || "");
      if (!conversationId) return;

      const index = state.conversations.findIndex(
        (item) => String(item?._id) === conversationId,
      );
      if (index === -1) return;

      state.conversations[index].typingLock = {
        lockedBy: payload.lockedBy || null,
        lockedAt: payload.lockedAt || null,
        expiresAt: payload.expiresAt || null,
      };
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Conversations
      .addCase(fetchConversations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchConversations.fulfilled, (state, action) => {
        state.loading = false;
        state.conversations = action.payload;
      })
      .addCase(fetchConversations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(assignConversation.fulfilled, (state, action) => {
        upsertConversation(state, action.payload);
      })
      .addCase(updateConversationStatus.fulfilled, (state, action) => {
        upsertConversation(state, action.payload);
      })
      .addCase(updateConversationTags.fulfilled, (state, action) => {
        upsertConversation(state, action.payload);
      })
      .addCase(addConversationNote.fulfilled, (state, action) => {
        const conversationId = String(action.payload?.conversationId || "");
        if (!conversationId) return;
        const index = state.conversations.findIndex(
          (item) => String(item?._id) === conversationId,
        );
        if (index === -1) return;
        state.conversations[index].internalNotes = Array.isArray(
          action.payload?.internalNotes,
        )
          ? action.payload.internalNotes
          : [];
      })
      .addCase(removeConversationNote.fulfilled, (state, action) => {
        const conversationId = String(action.payload?.conversationId || "");
        if (!conversationId) return;
        const index = state.conversations.findIndex(
          (item) => String(item?._id) === conversationId,
        );
        if (index === -1) return;
        state.conversations[index].internalNotes = Array.isArray(
          action.payload?.internalNotes,
        )
          ? action.payload.internalNotes
          : [];
      })
      .addCase(setConversationTypingLock.fulfilled, (state, action) => {
        const lock = action.payload || {};
        const conversationId = String(lock.conversationId || "");
        if (!conversationId) return;
        const index = state.conversations.findIndex(
          (item) => String(item?._id) === conversationId,
        );
        if (index === -1) return;
        state.conversations[index].typingLock = {
          lockedBy: lock.lockedBy || null,
          lockedAt: lock.lockedAt || null,
          expiresAt: lock.expiresAt || null,
        };
      })
      .addCase(setConversationTypingLock.rejected, (state, action) => {
        state.error =
          action.payload?.message || action.payload || "Typing lock failed";
      })
      .addCase(fetchWorkspaceAISettings.fulfilled, (state, action) => {
        state.aiSettings = action.payload || null;
      })
      .addCase(updateWorkspaceAISettings.fulfilled, (state, action) => {
        state.aiSettings = action.payload || state.aiSettings;
      })
      .addCase(fetchConversationAISummary.fulfilled, (state, action) => {
        const payload = action.payload || {};
        const conversationId = String(payload.conversationId || "");
        if (!conversationId) return;
        state.aiSummaryByConversation[conversationId] = payload;
      })
      .addCase(fetchConversationAISuggestions.fulfilled, (state, action) => {
        const payload = action.payload || {};
        const conversationId = String(payload.conversationId || "");
        if (!conversationId) return;
        state.aiSuggestionsByConversation[conversationId] = Array.isArray(
          payload.suggestions,
        )
          ? payload.suggestions
          : [];
      })
      // Fetch Messages
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.messages = action.payload;
      })
      // Send Message
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.messages.push(action.payload);
      })
      // AI Response
      .addCase(getAIResponse.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAIResponse.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.conversationId) {
          state.aiConversationId = action.payload.conversationId;
        }
        if (action.payload.ai) {
          state.aiMessages.push(action.payload.ai);
          if (!state.activeDirectUserId) {
            state.messages = state.aiMessages;
          }
        }
      })
      .addCase(getAIResponse.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch AI Messages
      .addCase(fetchAIMessages.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAIMessages.fulfilled, (state, action) => {
        state.loading = false;
        state.aiConversationId = action.payload.conversationId;
        state.aiMessages = action.payload.messages;
        if (!state.activeDirectUserId) {
          state.messages = state.aiMessages;
        }
      })
      .addCase(fetchAIMessages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch latest AI conversation
      .addCase(fetchLatestAIConversation.fulfilled, (state, action) => {
        state.aiConversationId = action.payload?._id || null;
      })
      // Fetch Direct Messages
      .addCase(fetchDirectMessages.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDirectMessages.fulfilled, (state, action) => {
        state.loading = false;
        const { userId, messages } = action.payload;
        state.directMessagesByUser[userId] = messages;
        state.activeDirectUserId = userId;
        state.messages = messages;
        state.unreadCountsByUser[userId] = 0;
        const latest = messages[messages.length - 1];
        if (latest) {
          upsertLatestMessage(state, userId, latest);
        }
        recomputeUnreadTotal(state);
      })
      .addCase(fetchDirectMessages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchUnreadDirectCounts.fulfilled, (state, action) => {
        const payload = action.payload || {};
        state.unreadCountsByUser = { ...(payload.bySender || {}) };
        state.totalUnread = Number(payload.total || 0);
      })
      .addCase(fetchDirectMessageUsers.pending, (state) => {
        state.error = null;
      })
      .addCase(fetchDirectMessageUsers.fulfilled, (state, action) => {
        state.directUsers = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchDirectMessageUsers.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(editDirectMessage.fulfilled, (state, action) => {
        const message = action.payload;
        if (!message?._id) return;
        const messageId = String(message._id);
        const updateList = (list = []) =>
          list.map((item) =>
            String(item?._id) === messageId ? { ...item, ...message } : item,
          );
        Object.keys(state.directMessagesByUser).forEach((userId) => {
          state.directMessagesByUser[userId] = updateList(
            state.directMessagesByUser[userId],
          );
        });
        state.messages = updateList(state.messages);
      })
      .addCase(deleteDirectMessage.fulfilled, (state, action) => {
        const messageId = String(action.payload?.messageId || "");
        if (!messageId) return;
        const removeFromList = (list = []) =>
          list.filter((item) => String(item?._id) !== messageId);
        Object.keys(state.directMessagesByUser).forEach((userId) => {
          state.directMessagesByUser[userId] = removeFromList(
            state.directMessagesByUser[userId],
          );
        });
        state.messages = removeFromList(state.messages);
      })
      .addCase(editDirectMessage.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(deleteDirectMessage.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export const {
  setActiveConversation,
  clearChatError,
  setAIConversationId,
  setActiveDirectUser,
  addLocalMessage,
  addMessage,
  setUnreadCounts,
  updateMessageLocal,
  deleteMessageLocal,
  setConversationLockLocal,
} = chatSlice.actions;

export const selectDirectMessagesForUser = (state, userId) =>
  state.chat.directMessagesByUser[userId] || [];

export default chatSlice.reducer;
