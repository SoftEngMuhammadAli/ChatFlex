import { state, DEFAULTS } from "./state.js";
import { uid } from "./utils.js";
import { mergeOptions, normalizeSuggestedMessages } from "./config.js";
import {
  request,
  getOrCreateVisitorId,
  fetchHistory,
  getStorageKey,
  uploadFile,
  refreshAssignment,
  leaveConversation,
  updateVisitorProfile,
  postVisitorMessageToConversation,
  editVisitorMessageInConversation,
  deleteVisitorMessageInConversation,
} from "./api.js";
import {
  connectSocket,
  emitTyping,
  emitPrivateMessage,
  emitEditMessage,
  emitDeleteMessage,
} from "./socket.js";
import {
  renderStyles,
  renderMessages,
  renderChatModeStatus,
  renderTypingStatus,
  renderFabUnreadBadge,
  renderFaqItems,
  showStatus,
  createWidgetMarkup,
} from "./ui.js";
import {
  pushMessage,
  handleRealtimeMessage,
  handleMessageUpdated,
  handleMessageDeleted,
} from "./messageHandlers.js";

const detectMessageLanguage = (text) => {
  const content = String(text || "").trim();
  if (!content) return "en";
  if (/[\u0600-\u06FF]/.test(content)) return "ur";
  if (/[\u0900-\u097F]/.test(content)) return "hi";
  if (/[\u4E00-\u9FFF]/.test(content)) return "zh";
  if (/[\u3040-\u30ff]/.test(content)) return "ja";
  if (/\b(hola|gracias|por favor|ayuda|necesito)\b/i.test(content)) return "es";
  if (/\b(bonjour|merci|sil vous plait|aide|besoin)\b/i.test(content)) return "fr";
  if (/\b(hallo|danke|hilfe|bitte)\b/i.test(content)) return "de";
  if (/\b(ciao|grazie|aiuto)\b/i.test(content)) return "it";
  return "en";
};

async function init(inputOptions) {
  if (state.initialized) return;

  // 1. Setup Options & ID
  state.options = mergeOptions(inputOptions || {});
  state.detectedLanguage = String(state.options?.metadata?.language || "en")
    .trim()
    .toLowerCase();
  if (state.options.visitorEmail) {
    state.options.visitorEmail = String(state.options.visitorEmail)
      .trim()
      .toLowerCase();
  }
  state.visitorId = getOrCreateVisitorId(uid);
  const preChatSubmittedKey = getStorageKey("prechat_submitted");
  const preChatProfileKey = getStorageKey("prechat_profile");
  const storedPreChatVisitorId = String(
    localStorage.getItem(preChatSubmittedKey) || "",
  ).trim();
  state.preChatFormSubmitted =
    Boolean(storedPreChatVisitorId) &&
    storedPreChatVisitorId === String(state.visitorId || "");

  if (state.preChatFormSubmitted) {
    try {
      const storedProfileRaw = localStorage.getItem(preChatProfileKey);
      const storedProfile = storedProfileRaw
        ? JSON.parse(storedProfileRaw)
        : null;
      const storedName = String(storedProfile?.name || "").trim();
      const storedEmail = String(storedProfile?.email || "")
        .trim()
        .toLowerCase();
      const storedPhone = String(storedProfile?.phone || "").trim();

      if (storedName && state.options.visitorName === "Website Visitor") {
        state.options.visitorName = storedName;
      }
      if (storedEmail && !state.options.visitorEmail) {
        state.options.visitorEmail = storedEmail;
      }
      if (storedPhone && !state.options?.metadata?.phone) {
        state.options.metadata = {
          ...(state.options.metadata || {}),
          phone: storedPhone,
        };
      }
      if (storedEmail) {
        state.options.metadata = {
          ...(state.options.metadata || {}),
          email: storedEmail,
        };
      }
    } catch {
      // Ignore malformed local storage profile payload.
    }
  }

  // 2. Load Config & Session
  const configQuery = new URLSearchParams();
  if (state.options.apiKey) configQuery.set("apiKey", state.options.apiKey);
  if (state.options.widgetId)
    configQuery.set("widgetId", state.options.widgetId);
  if (state.options.widgetToken)
    configQuery.set("widgetToken", state.options.widgetToken);

  const config = await request("/config?" + configQuery.toString()).catch(
    () => ({}),
  );
  const payload = (config && config.data) || {};
  const widgetSettings = payload.settings || {};
  const widgetDetails = widgetSettings.widget || {};
  const visitorProfile = payload.visitorProfile || {};
  const configuredWidgetName = String(
    widgetDetails.name || payload.workspaceName || "",
  ).trim();
  const configuredWidgetTitle = String(widgetDetails.title || "").trim();
  const defaultTitle = String(DEFAULTS.title || "").trim().toLowerCase();
  const isDefaultConfiguredTitle =
    configuredWidgetTitle.toLowerCase() === defaultTitle;
  const resolvedPosition =
    widgetSettings.position ||
    widgetDetails.position ||
    payload.position ||
    DEFAULTS.position;
  if (widgetSettings.brandColor)
    state.options.theme.primary = widgetSettings.brandColor;
  if (!state.options.hasCustomPosition) {
    state.options.position = resolvedPosition === "left" ? "left" : "right";
  }
  if (!state.options.hasCustomTitle) {
    if (configuredWidgetName && (!configuredWidgetTitle || isDefaultConfiguredTitle)) {
      state.options.title = configuredWidgetName;
    } else if (configuredWidgetTitle) {
      state.options.title = configuredWidgetTitle;
    }
  }
  if (widgetDetails.subtitle && !state.options.hasCustomSubtitle) {
    state.options.subtitle = widgetDetails.subtitle;
  }
  if (widgetSettings.welcomeMessage && !state.options.hasCustomWelcomeMessage) {
    state.options.welcomeMessage = widgetSettings.welcomeMessage;
  }
  if (widgetSettings.logoUrl && !state.options.hasCustomLogoUrl) {
    state.options.logoUrl = widgetSettings.logoUrl;
  }
  if (widgetDetails.textColor)
    state.options.theme.text = widgetDetails.textColor;
  if (widgetDetails.backgroundColor) {
    state.options.theme.background = widgetDetails.backgroundColor;
  }
  if (Number(widgetDetails.width) > 0) {
    state.options.theme.chatWindow.width = Number(widgetDetails.width);
  }
  if (Number(widgetDetails.height) > 0) {
    state.options.theme.chatWindow.height = Number(widgetDetails.height);
  }

  if (widgetSettings.showEmojis !== undefined) {
    state.options.showEmojis = !!widgetSettings.showEmojis;
  }
  if (widgetSettings.allowFileUploads !== undefined) {
    state.options.allowFileUploads = !!widgetSettings.allowFileUploads;
  }
  if (widgetSettings.showFaqs !== undefined) {
    state.options.showFaqs = widgetSettings.showFaqs !== false;
  }
  if (
    !state.options.hasCustomAutoReplySuggestions &&
    widgetSettings.autoReplySuggestions !== undefined
  ) {
    state.options.autoReplySuggestions =
      widgetSettings.autoReplySuggestions !== false;
  }
  if (widgetSettings.preChatForm) {
    state.options.preChatForm = widgetSettings.preChatForm;
  }
  if (widgetSettings.departmentSelection) {
    state.options.departmentSelection = widgetSettings.departmentSelection;
  }
  if (widgetSettings.businessHours) {
    state.options.businessHours = widgetSettings.businessHours;
  }
  if (widgetSettings.offlineMode !== undefined) {
    state.options.offlineMode = widgetSettings.offlineMode === true;
  }

  if (visitorProfile.name) {
    state.options.visitorName = String(visitorProfile.name);
  }
  if (visitorProfile.email) {
    const restrictedVisitorEmail = String(visitorProfile.email)
      .trim()
      .toLowerCase();
    state.options.restrictedVisitorEmail = restrictedVisitorEmail;
  }
  if (visitorProfile.phone) {
    state.options.metadata = {
      ...(state.options.metadata || {}),
      phone: String(visitorProfile.phone),
    };
  }
  state.faqItems =
    state.options.showFaqs === false ? [] : payload.faqItems || [];
  const payloadSuggestedMessages = normalizeSuggestedMessages(
    payload.suggestedMessages,
    state.faqItems,
  );
  const settingsSuggestedMessages = normalizeSuggestedMessages(
    widgetSettings.suggestedMessages,
    state.faqItems,
  );
  // Merge suggested messages from server config (top-level or settings), but don't override embed-time ones
  if (!state.options.hasCustomSuggestedMessages) {
    state.options.suggestedMessages =
      payloadSuggestedMessages.length > 0
        ? payloadSuggestedMessages
        : settingsSuggestedMessages.length > 0
          ? settingsSuggestedMessages
          : [];
  }

  const restrictedVisitorEmail = String(
    state.options?.restrictedVisitorEmail || "",
  )
    .trim()
    .toLowerCase();
  const visitorEmail = String(state.options?.visitorEmail || "")
    .trim()
    .toLowerCase();
  const shouldDelaySessionStart =
    (state.options?.preChatForm?.enabled && !state.preChatFormSubmitted) ||
    (Boolean(restrictedVisitorEmail) && visitorEmail !== restrictedVisitorEmail);

  if (!shouldDelaySessionStart) {
    const session = await request("/start", {
      method: "POST",
      body: {
        apiKey: state.options.apiKey,
        widgetId: state.options.widgetId,
        widgetToken: state.options.widgetToken,
        visitorId: state.visitorId,
        visitorEmail: state.options.visitorEmail,
        metadata: state.options.metadata,
        department:
          state.options.selectedDepartment || state.options.metadata?.department || "",
      },
    });
    const sessionData = (session && session.data) || {};
    state.workspaceId = String(sessionData.workspaceId || "");
    state.visitorUserId = String(sessionData.visitorUserId || "");
    state.socketToken = String(sessionData.socketToken || "");
    state.assignedAgentId = String(sessionData.assignedAgentId || "");
    state.conversationId = String(sessionData.conversationId || "");
    state.options.selectedDepartment = String(sessionData.department || "");
  }

  // Offline UI hint: when offline mode is enabled or business hours are outside.
  const isOutsideBusinessHours = (() => {
    const bh = state.options.businessHours || {};
    if (!bh || bh.enabled !== true) return false;
    try {
      const weekdays = Array.isArray(bh.weekdays) && bh.weekdays.length > 0 ? bh.weekdays : [1, 2, 3, 4, 5];
      const parseTime = (value, fallback) => {
        const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(String(value || fallback || "").trim());
        if (!match) return parseTime(fallback, "09:00");
        return Number(match[1]) * 60 + Number(match[2]);
      };
      const startMinutes = parseTime(bh.startTime, "09:00");
      const endMinutes = parseTime(bh.endTime, "18:00");
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: bh.timezone || "UTC",
        hour12: false,
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).formatToParts(new Date());
      const weekdayName = String(parts.find((p) => p.type === "weekday")?.value || "Mon");
      const weekdayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      const weekday = weekdayMap[weekdayName] ?? 1;
      if (!weekdays.includes(weekday)) return true;
      const hours = Number(parts.find((p) => p.type === "hour")?.value || 0);
      const minutes = Number(parts.find((p) => p.type === "minute")?.value || 0);
      const nowMinutes = hours * 60 + minutes;
      if (startMinutes <= endMinutes) {
        return nowMinutes < startMinutes || nowMinutes > endMinutes;
      }
      return !(nowMinutes >= startMinutes || nowMinutes <= endMinutes);
    } catch {
      return false;
    }
  })();
  state.isOffline = Boolean(state.options.offlineMode) || Boolean(isOutsideBusinessHours);

  // 3. Render
  renderStyles();
  const { root, elements } = createWidgetMarkup(state.options, {
    onOpen: () => {
      if (state.socket?.connected && state.assignedAgentId) {
        state.socket.emit("mark_thread_read", {
          otherUserId: state.assignedAgentId,
        });
      }
      if (state.conversationId) {
        refreshAssignment()
          .then(() => renderChatModeStatus())
          .catch(() => {});
      }
      fetchHistory(pushMessage).catch(() => {});
    },
    onSend: async (text, selectedFiles = []) => {
      const files = Array.isArray(selectedFiles) ? selectedFiles : [];
      if (!text.trim() && files.length === 0) return false;
      const restrictedVisitorEmail = String(
        state.options?.restrictedVisitorEmail || "",
      )
        .trim()
        .toLowerCase();
      const visitorEmail = String(state.options?.visitorEmail || "")
        .trim()
        .toLowerCase();
      const requiresRestrictedIdentity =
        Boolean(restrictedVisitorEmail) &&
        visitorEmail !== restrictedVisitorEmail;

      if (
        (state.options?.preChatForm?.enabled || requiresRestrictedIdentity) &&
        !state.preChatFormSubmitted
      ) {
        showStatus("Please complete the form before starting chat.");
        return false;
      }

      if (!state.assignedAgentId) {
        if (state.options.selectedDepartment) {
          state.options.metadata = {
            ...(state.options.metadata || {}),
            department: state.options.selectedDepartment,
          };
        }
        const success = await refreshAssignment();
        if (!success) {
          throw new Error("Unable to start chat session. Please try again.");
        }
      }

      let attachments = [];
      if (files.length > 0) {
        showStatus(
          files.length === 1
            ? `Uploading ${files[0].name}...`
            : `Uploading ${files.length} attachments...`,
        );
        for (const file of files) {
          try {
            const result = await uploadFile(file);
            const uploaded = result?.data || {};
            if (!uploaded.url) continue;
            attachments.push({
              url: uploaded.url,
              type: uploaded.type || file.type,
              name: uploaded.name || file.name,
              size: uploaded.size || file.size,
            });
          } catch (error) {
            const reason = String(error?.message || "Upload failed");
            showStatus(`Upload failed for ${file.name}: ${reason}`);
          }
        }
        if (files.length > 0 && attachments.length === 0) {
          throw new Error("Attachment upload did not complete. Please retry.");
        }
      }

      const normalizedText =
        text.trim() ||
        (attachments.length > 1
          ? `[Files: ${attachments.length}]`
          : attachments.length === 1
            ? `[File: ${attachments[0].name || "Attachment"}]`
            : "");
      const detectedLanguage = detectMessageLanguage(normalizedText);
      if (
        detectedLanguage &&
        detectedLanguage !== String(state.detectedLanguage || "")
      ) {
        state.detectedLanguage = detectedLanguage;
        state.options.metadata = {
          ...(state.options.metadata || {}),
          language: detectedLanguage,
        };
        updateVisitorProfile({ language: detectedLanguage }).catch(() => {});
      }
      const canUseSocket = Boolean(
        state.socket?.connected &&
          state.socketJoined &&
          state.assignedAgentId &&
          state.visitorUserId,
      );

      if (canUseSocket) {
        pushMessage({
          _id: uid("tmp"),
          senderId: state.visitorUserId,
          receiverId: state.assignedAgentId,
          senderType: "visitor",
          content: normalizedText,
          attachments,
          createdAt: new Date().toISOString(),
          isOptimistic: true,
        });
        emitPrivateMessage(normalizedText, attachments);
        return true;
      }

      const result = await postVisitorMessageToConversation(
        normalizedText,
        attachments,
      );
      const persisted = result?.data;
      pushMessage({
        _id: String(persisted?._id || uid("msg")),
        senderId: String(persisted?.senderId || state.visitorUserId),
        receiverId: String(persisted?.receiverId || state.assignedAgentId),
        senderType: "visitor",
        content: String(persisted?.content || normalizedText),
        attachments: Array.isArray(persisted?.attachments)
          ? persisted.attachments
          : attachments,
        createdAt: persisted?.createdAt || new Date().toISOString(),
      });
      return true;
    },
    onTyping: (isTyping) => emitTyping(isTyping),
    onLeaveChat: async () => {
      const previousConversationId = String(state.conversationId || "");
      const previousVisitorId = String(state.visitorId || "");

      try {
        await leaveConversation(previousConversationId, previousVisitorId);
      } catch {
        // Continue with local reset even if backend leave call fails.
      }

      // Full session reset so next message starts as a fresh visitor + fresh chat.
      const nextVisitorId = uid("visitor");
      try {
        localStorage.setItem(getStorageKey("visitor_id"), nextVisitorId);
        localStorage.removeItem(getStorageKey("prechat_submitted"));
        localStorage.removeItem(getStorageKey("prechat_profile"));
      } catch {}

      state.visitorId = nextVisitorId;
      state.visitorUserId = "";
      state.socketToken = "";
      state.workspaceId = "";
      state.messages = [];
      state.localFaqChat = [];
      state.unreadCount = 0;
      state.lastMessageAt = null;
      state.assignedAgentId = "";
      state.conversationId = "";
      state.forceNewConversation = true;
      state.isAgentTyping = false;
      state.isLocalTyping = false;
      state.socketJoined = false;
      state.preChatFormSubmitted = false;
      renderMessages();
      renderChatModeStatus();

      showStatus("Chat ended. Next message will start a brand-new chat.");
    },
    onMove: () => {
      const next = state.options.position === "right" ? "left" : "right";
      state.root.classList.remove("cfw-left", "cfw-right");
      state.root.classList.add("cfw-" + next);
      state.options.position = next;
      localStorage.setItem(getStorageKey("position"), next);
    },
  });

  state.root = root;
  state.elements = elements;
  state.messageActions = {
    onEdit: (msg) => {
      msg.isEditing = true;
      renderMessages();
    },
    onSaveEdit: async (msg, newContent) => {
      const messageId = String(msg?._id || "");
      if (!messageId) return;
      const nextValue = String(newContent).trim();
      if (!nextValue) return;
      
      msg.isEditing = false;
      if (state.socket?.connected) {
        emitEditMessage(messageId, nextValue);
      } else {
        try {
          const result = await editVisitorMessageInConversation(
            messageId,
            nextValue,
          );
          const message = result?.data;
          if (message?._id) {
            handleMessageUpdated(message);
          }
        } catch (error) {
          showStatus(error?.message || "Unable to edit message.");
        }
      }
      renderMessages();
    },
    onCancelEdit: (msg) => {
      msg.isEditing = false;
      renderMessages();
    },
    onDeleteRequest: (msg) => {
      msg.confirmDelete = true;
      renderMessages();
    },
    onConfirmDelete: async (msg) => {
      const messageId = String(msg?._id || "");
      if (!messageId) return;
      msg.confirmDelete = false;
      if (state.socket?.connected) {
        emitDeleteMessage(messageId);
      } else {
        try {
          await deleteVisitorMessageInConversation(messageId);
          handleMessageDeleted({ messageId });
        } catch (error) {
          showStatus(error?.message || "Unable to delete message.");
        }
      }
      renderMessages();
    },
    onCancelDelete: (msg) => {
      msg.confirmDelete = false;
      renderMessages();
    },
  };
  document.body.appendChild(root);

  renderFaqItems(elements.settingsFaqItems);
  renderMessages();
  renderChatModeStatus();
  renderFabUnreadBadge();

  // 4. Sockets
  await connectSocket({
    handleRealtimeMessage,
    handleMessageUpdated,
    handleMessageDeleted,
    renderTypingStatus,
    onUnreadCounts: (payload) => {
      state.unreadCount = Number(payload?.total || 0);
      renderFabUnreadBadge();
    },
    onAssignmentChange: () => renderChatModeStatus(),
    onSocketStatusChange: () => renderChatModeStatus(),
    onMessageError: (payload) => {
      const message = String(payload?.error || "").trim();
      if (message) showStatus(message);
    },
  });

  // 5. Polling Fallback
  const startPolling = () => {
    if (state.pollTimer) return;
    state.pollTimer = setInterval(() => {
      fetchHistory(pushMessage).catch(() => {});
    }, state.options.pollIntervalMs);
  };

  const stopPolling = () => {
    if (state.pollTimer) {
      clearInterval(state.pollTimer);
      state.pollTimer = null;
    }
  };

  startPolling();
  
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      stopPolling();
    } else if (state.root?.querySelector(".cfw-panel.cfw-visible")) {
      startPolling();
    }
  });

  state.pollingControls = { start: startPolling, stop: stopPolling };
  state.initialized = true;
}

window.ChatFlexWidget = {
  init: (opts) =>
    init(opts).catch((err) => console.error("ChatFlexWidget error:", err)),
};
