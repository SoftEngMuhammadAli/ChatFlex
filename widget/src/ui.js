import { state } from "./state.js";
import {
  refreshAssignment,
  getStorageKey,
  updateVisitorProfile,
} from "./api.js";
import { WIDGET_STYLE } from "./styles.js";
import { renderHeader } from "./components/Header.js";
import {
  renderMessageList,
  renderMessageItem,
} from "./components/MessageList.js";
import { renderChatInput } from "./components/ChatInput.js";
import { renderFaqItem } from "./components/Faq.js";
import { renderSettingsContainer } from "./components/Settings.js";
import { renderFab } from "./components/Fab.js";
import { renderPreChatForm } from "./components/PreChatForm.js";
import { mountEmojiPicker } from "./emojiPicker.js";

function isPreChatLocked() {
  const restrictedEmail = String(state.options?.restrictedVisitorEmail || "")
    .trim()
    .toLowerCase();
  const visitorEmail = String(state.options?.visitorEmail || "")
    .trim()
    .toLowerCase();
  const requiresRestrictedIdentity =
    Boolean(restrictedEmail) && visitorEmail !== restrictedEmail;
  return Boolean(
    (state.options?.preChatForm?.enabled || requiresRestrictedIdentity) &&
    !state.preChatFormSubmitted &&
    state.messages.length === 0 &&
    state.localFaqChat.length === 0,
  );
}

function showFaqConversation(question, answer) {
  if (!question) return;
  state.localFaqChat = [
    { type: "visitor", content: question },
    { type: "agent", content: answer || "No answer available yet." },
  ];
}

function areFaqsVisible() {
  return (
    state.options?.showFaqs !== false &&
    Array.isArray(state.faqItems) &&
    state.faqItems.length > 0
  );
}

function getVisibleSuggestedMessages() {
  if (state.options?.autoReplySuggestions === false) return [];
  if (!Array.isArray(state.options?.suggestedMessages)) return [];

  return state.options.suggestedMessages
    .map((item) => {
      if (typeof item === "string") {
        const message = String(item || "").trim();
        return message
          ? {
              message,
              answer:
                "Thanks for your message. A support agent will assist you shortly.",
            }
          : null;
      }

      if (!item || typeof item !== "object") return null;
      const message = String(
        item.message || item.text || item.question || "",
      ).trim();
      if (!message) return null;
      const answer = String(item.answer || item.reply || "").trim();

      return {
        message,
        answer:
          answer ||
          "Thanks for your message. A support agent will assist you shortly.",
      };
    })
    .filter(Boolean);
}

function setSettingsVisible(visible) {
  const settingsWrap = state.elements.settingsWrap;
  const messages = state.elements.messages;
  const typing = state.elements.typing;
  const footer = state.elements.footer;
  if (!settingsWrap || !messages || !typing || !footer) return;
  settingsWrap.classList.toggle("cfw-hidden", !visible);
  messages.classList.toggle("cfw-hidden", visible);
  typing.classList.toggle("cfw-hidden", visible || isPreChatLocked());
  footer.classList.toggle("cfw-hidden", visible || isPreChatLocked());
  updateHeaderActionsState();
}

function updateHeaderActionsState() {
  const homeBackBtn = state.elements.homeBackBtn;
  const settingsBtn = state.elements.settingsBtn;
  if (!homeBackBtn || !settingsBtn) return;
  const showHomeBack =
    state.localFaqChat.length > 0 && state.messages.length === 0;
  homeBackBtn.classList.toggle("cfw-hidden", !showHomeBack);
  settingsBtn.classList.toggle("cfw-hidden", showHomeBack);
}

function openFaqSettingsTab() {
  state.localFaqChat = [];
  renderMessages();
  setSettingsVisible(true);
  if (state.options?.showFaqs === false) {
    return;
  }
  renderFaqItems(
    state.elements.settingsFaqItems,
    state.elements.faqSearch?.value || "",
  );
}

function clearTransientFaqConversation() {
  if (state.messages.length === 0 && state.localFaqChat.length > 0) {
    state.localFaqChat = [];
    renderMessages();
  }
}

function updateChatModeStatus() {
  const node = state.elements.chatMode;
  const statusIndicator = state.elements.statusIndicator;
  if (!node) return;
  if (isPreChatLocked()) {
    node.textContent = "Pre-chat form required";
    if (statusIndicator) statusIndicator.style.background = "#f59e0b";
    return;
  }
  if (state.isOffline) {
    node.textContent = "Offline — leave a message";
    if (statusIndicator) statusIndicator.style.background = "#f97316";
    return;
  }
  if (state.assignedAgentId) {
    node.textContent = "Agent online";
    if (statusIndicator) statusIndicator.style.background = "#22c55e";
    return;
  }
  node.textContent = "Connecting to live support";
  if (statusIndicator) statusIndicator.style.background = "#f59e0b";
}

function syncConversationUiState() {
  setSettingsVisible(false);

  const hasStarted =
    state.messages.length > 0 ||
    state.preChatFormSubmitted ||
    state.localFaqChat.length > 0;

  if (state.elements.headerSub) {
    state.elements.headerSub.style.display = hasStarted ? "none" : "block";
  }

  updateChatModeStatus();
  if (state.elements.chatMode) {
    state.elements.chatMode.style.display = "block";
  }

  updateHeaderActionsState();
}

export function renderStyles() {
  if (document.getElementById("chatflex-widget-style")) return;
  const style = document.createElement("style");
  style.id = "chatflex-widget-style";
  style.textContent = WIDGET_STYLE;
  document.head.appendChild(style);
}

export function renderMessages() {
  const wrap = state.elements.messages;
  if (!wrap) return;
  wrap.innerHTML = "";

  const hasRealMessages = state.messages.length > 0;
  const hasFaqChat = state.localFaqChat.length > 0;
  const restrictedVisitorEmail = String(
    state.options?.restrictedVisitorEmail || "",
  )
    .trim()
    .toLowerCase();
  const visitorEmail = String(state.options?.visitorEmail || "")
    .trim()
    .toLowerCase();
  const requiresRestrictedIdentity =
    Boolean(restrictedVisitorEmail) && visitorEmail !== restrictedVisitorEmail;
  const configuredPreChatFields = Array.isArray(
    state.options?.preChatForm?.fields,
  )
    ? [...state.options.preChatForm.fields]
    : [];
  const hasEmailField = configuredPreChatFields.some((field) => {
    const label = String(field?.label || "")
      .trim()
      .toLowerCase();
    return (
      String(field?.type || "").toLowerCase() === "email" ||
      label.includes("email")
    );
  });
  const effectivePreChatFields =
    requiresRestrictedIdentity && !hasEmailField
      ? [
          ...configuredPreChatFields,
          {
            label: "Email",
            type: "email",
            required: true,
            placeholder: "you@example.com",
          },
        ]
      : configuredPreChatFields;
  const departmentSelection = state.options?.departmentSelection || {};
  const departmentOptions = Array.isArray(departmentSelection?.options)
    ? departmentSelection.options
    : [];
  const hasDepartmentField = effectivePreChatFields.some((field) => {
    const label = String(field?.label || "")
      .trim()
      .toLowerCase();
    return label.includes("department");
  });
  if (
    departmentSelection?.enabled &&
    departmentOptions.length > 0 &&
    !hasDepartmentField
  ) {
    effectivePreChatFields.push({
      label: "Department",
      type: "select",
      required: true,
      placeholder: "Choose a department",
      options: departmentOptions,
    });
  }
  const showPreChat =
    (state.options?.preChatForm?.enabled || requiresRestrictedIdentity) &&
    !state.preChatFormSubmitted &&
    !hasRealMessages &&
    !hasFaqChat;

  if (showPreChat) {
    syncConversationUiState();
    wrap.innerHTML = "";
    wrap.appendChild(
      renderPreChatForm(
        effectivePreChatFields,
        async (data) => {
          showStatus("Starting chat...");
          try {
            const fallbackEmail = requiresRestrictedIdentity
              ? ""
              : state.options?.visitorEmail || "";
            const emailValue = String(
              data.email ||
                data.Email ||
                data.email_address ||
                fallbackEmail ||
                "",
            )
              .trim()
              .toLowerCase();
            const nameValue = String(
              data.name || data.Name || data.full_name || "",
            ).trim();
            const phoneValue = String(
              data.phone || data.Phone || data.phone_number || "",
            ).trim();
            const departmentValue = String(
              data.department ||
                data.Department ||
                data.department_name ||
                data.department_key ||
                "",
            )
              .trim()
              .toLowerCase();
            if (restrictedVisitorEmail && !emailValue) {
              throw new Error("Email is required to start this chat.");
            }
            if (
              restrictedVisitorEmail &&
              emailValue !== restrictedVisitorEmail
            ) {
              throw new Error(
                "The provided email is not allowed for this widget.",
              );
            }

            state.options.metadata = {
              ...(state.options.metadata || {}),
              ...(nameValue ? { name: nameValue } : {}),
              ...(emailValue ? { email: emailValue } : {}),
              ...(phoneValue ? { phone: phoneValue } : {}),
              ...(departmentValue ? { department: departmentValue } : {}),
            };
            if (emailValue) {
              state.options.visitorEmail = emailValue;
            }
            if (nameValue) {
              state.options.visitorName = nameValue;
            }
            if (departmentValue) {
              state.options.selectedDepartment = departmentValue;
            }

            const profilePayload = {
              ...data,
              ...(nameValue ? { name: nameValue } : {}),
              ...(emailValue ? { email: emailValue } : {}),
              ...(phoneValue ? { phone: phoneValue } : {}),
              ...(departmentValue ? { department: departmentValue } : {}),
            };

            try {
              await updateVisitorProfile(profilePayload);
            } catch (profileError) {
              throw new Error(
                String(
                  profileError?.message ||
                    "Unable to validate visitor profile.",
                ),
              );
            }

            // Initialize session
            await refreshAssignment();
            state.preChatFormSubmitted = true;
            try {
              localStorage.setItem(
                getStorageKey("prechat_submitted"),
                String(state.visitorId || ""),
              );
              localStorage.setItem(
                getStorageKey("prechat_profile"),
                JSON.stringify({
                  name: nameValue || "",
                  email: emailValue || "",
                  phone: phoneValue || "",
                  department: departmentValue || "",
                }),
              );
            } catch {
              // Local storage is optional.
            }
            renderMessages();
            syncConversationUiState();
          } catch (err) {
            showStatus("Error: " + err.message);
          }
        },
        {
          restrictedEmail: state.options?.restrictedVisitorEmail || "",
          requireEmail: requiresRestrictedIdentity,
        },
      ),
    );
    return;
  }

  if (!hasRealMessages && !hasFaqChat && !state.isSendingMessage) {
    const suggestedMessages = getVisibleSuggestedMessages();
    // ── Welcome screen ────────────────────────────────────────────────────────
    const empty = document.createElement("div");
    empty.className = "cfw-welcome-card";
    empty.innerHTML = `
      <h3 class="cfw-welcome-title">Hello! <span>👋</span></h3>
      <p class="cfw-welcome-sub">${state.options?.subtitle || "Most first responses arrive in under 5 minutes during business hours"}</p>
      <button type="button" class="cfw-welcome-cta cfw-js-welcome-start">
        Start Conversation
      </button>
      ${
        suggestedMessages.length > 0
          ? `
        <p class="cfw-suggested-label">SUGGESTED</p>
        <div class="cfw-suggested-list">
          ${suggestedMessages
            .map(
              (item) =>
                `<button type="button" class="cfw-suggested-item cfw-js-suggested" data-message="${String(item.message || "").replace(/"/g, "&quot;")}" data-answer="${String(item.answer || "").replace(/"/g, "&quot;")}">${item.message}</button>`,
            )
            .join("")}
        </div>
      `
          : ""
      }
      ${
        areFaqsVisible()
          ? `
        <p class="cfw-suggested-label">BROWSE HELP TOPICS</p>
        <button type="button" class="cfw-welcome-cta cfw-js-browse-faq-tab" style="margin-bottom:10px;">
          Browse FAQs
        </button>
        <div class="cfw-faq-quickreply-list">
          ${state.faqItems
            .slice(0, 5)
            .map(
              (faq) =>
                `<button type="button" class="cfw-faq-quickreply-btn cfw-js-faq-qr" data-question="${(faq.question || "").replace(/"/g, "&quot;")}" data-answer="${(faq.answer || "").replace(/"/g, "&quot;")}">
                  <span class="cfw-faq-qr-q">${faq.question || ""}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                </button>`,
            )
            .join("")}
        </div>
      `
          : ""
      }
    `;
    wrap.appendChild(empty);

    const input = state.elements.input;
    const sendBtn = state.elements.sendBtn;
    const startBtn = empty.querySelector(".cfw-js-welcome-start");
    const predefinedStartMessage = String(
      state.options?.startConversationMessage || "Hi, I need some help.",
    ).trim();
    if (startBtn && input && sendBtn) {
      startBtn.onclick = () => {
        if (!predefinedStartMessage) {
          input.focus();
          return;
        }
        input.value = predefinedStartMessage;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        sendBtn.click();
      };
    }

    empty.querySelectorAll(".cfw-js-suggested").forEach((btn) => {
      btn.onclick = () => {
        const message = String(
          btn.dataset.message || btn.textContent || "",
        ).trim();
        const answer = String(btn.dataset.answer || "").trim();
        if (!message) return;
        if (answer) {
          showFaqConversation(message, answer);
          renderMessages();
          return;
        }
        if (!input || !sendBtn) return;
        input.value = message;
        sendBtn.click();
      };
    });

    // FAQ quick-reply: push into localFaqChat (NOT real messages)
    empty.querySelectorAll(".cfw-js-faq-qr").forEach((btn) => {
      btn.onclick = () => {
        const question = btn.dataset.question || "";
        const answer = btn.dataset.answer || "";
        showFaqConversation(question, answer);
        renderMessages();
      };
    });
    const browseFaqBtn = empty.querySelector(".cfw-js-browse-faq-tab");
    if (browseFaqBtn) {
      browseFaqBtn.onclick = () => openFaqSettingsTab();
    }
  } else if (hasFaqChat && !hasRealMessages) {
    // ── FAQ browsing mode (localFaqChat, no real messages) ────────────────────
    state.localFaqChat.forEach((msg) => {
      const row = document.createElement("div");
      row.className = "cfw-row " + (msg.type === "visitor" ? "me" : "other");
      const bubble = document.createElement("div");
      bubble.className = "cfw-bubble";
      bubble.textContent = msg.content;
      row.appendChild(bubble);
      wrap.appendChild(row);
    });
  } else {
    // ── Real chat messages ────────────────────────────────────────────────────
    state.messages.forEach((msg) => {
      const mine = msg.senderType === "visitor";
      wrap.appendChild(
        renderMessageItem(msg, mine, state.messageActions || {}),
      );
    });
  }

  wrap.scrollTo({ top: wrap.scrollHeight, behavior: "smooth" });
  renderTypingStatus();
  syncConversationUiState();
}

export function renderTypingStatus() {
  if (!state.elements.typing) return;
  const container = state.elements.typing;
  if (state.isAgentTyping) {
    container.innerHTML = `
      <div class="cfw-typing-dots">
        <div class="cfw-typing-dot"></div>
        <div class="cfw-typing-dot"></div>
        <div class="cfw-typing-dot"></div>
      </div>
      <span style="font-size: 11px; margin-left: 4px; opacity: 0.8;">Agent is typing...</span>
    `;
  } else {
    container.innerHTML = "";
  }
}

export function renderFabUnreadBadge() {
  const badge = state.elements.fabBadge;
  if (!badge) return;
  const unread = Number(state.unreadCount || 0);
  badge.textContent = unread > 99 ? "99+" : String(unread);
  badge.classList.toggle("cfw-hidden", unread <= 0);
}

export function renderChatModeStatus() {
  updateChatModeStatus();
}

export function renderFaqItems(container, search = "") {
  if (!container) return;
  if (state.options?.showFaqs === false) {
    container.innerHTML = "";
    const disabled = document.createElement("p");
    disabled.className = "cfw-settings-help";
    disabled.style.textAlign = "center";
    disabled.style.padding = "20px 0";
    disabled.textContent = "FAQs are disabled for this widget.";
    container.appendChild(disabled);
    return;
  }
  const filtered = state.faqItems.filter((item) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      item.question?.toLowerCase().includes(s) ||
      item.answer?.toLowerCase().includes(s)
    );
  });

  container.innerHTML = "";
  if (!filtered.length) {
    const empty = document.createElement("p");
    empty.className = "cfw-settings-help";
    empty.style.textAlign = "center";
    empty.style.padding = "20px 0";
    empty.textContent = search ? "No results found." : "No FAQs available yet.";
    container.appendChild(empty);
    return;
  }

  filtered.forEach((faq) => {
    // In FAQ tab, keep interaction inside tab (expand/collapse), do not redirect to chat.
    container.appendChild(renderFaqItem(faq));
  });
}

export function showStatus(text) {
  if (!state.elements.note) return;
  state.elements.note.textContent = text;
  setTimeout(() => {
    if (state.elements.note.textContent === text) {
      state.elements.note.textContent = "Powered by ChatFlex";
    }
  }, 5000);
}

export function createWidgetMarkup(options, handlers) {
  const root = document.createElement("div");
  root.className = "cfw-root cfw-" + options.position;

  // Set theme variables
  root.style.setProperty("--cfw-primary", options.theme.primary);
  root.style.setProperty("--cfw-text", options.theme.text);
  root.style.setProperty("--cfw-bg", options.theme.background);
  root.style.setProperty("--cfw-width", options.theme.chatWindow.width + "px");
  root.style.setProperty(
    "--cfw-height",
    options.theme.chatWindow.height + "px",
  );

  // Helper for RGB values (for focus rings)
  const hexToRgb = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r}, ${g}, ${b}`;
  };
  root.style.setProperty("--cfw-primary-rgb", hexToRgb(options.theme.primary));

  root.innerHTML = `
      <div class="cfw-panel">
        ${renderHeader(options)}
        ${renderSettingsContainer(options.showFaqs !== false)}
        ${renderMessageList()}
      <div class="cfw-typing"></div>
      ${renderChatInput(options)}
      <div class="cfw-note">Powered by ChatFlex</div>
    </div>
    ${renderFab(options.theme.primary, options.logoUrl)}
  `;

  const fab = root.querySelector(".cfw-fab");
  const panel = root.querySelector(".cfw-panel");
  const input = root.querySelector(".cfw-input");
  const sendBtn = root.querySelector(".cfw-send");
  const moveBtn = root.querySelector(".cfw-js-move");
  const settingsBtn = root.querySelector(".cfw-js-settings");
  const homeBackBtn = root.querySelector(".cfw-js-home-back");
  const headerCloseBtn = root.querySelector(".cfw-js-header-close");
  const headerSub = root.querySelector(".cfw-js-header-sub");
  const settingsWrap = root.querySelector(".cfw-settings");
  const settingsBackBtn = root.querySelector(".cfw-js-settings-back");
  const leaveChatBtn = root.querySelector(".cfw-js-leave-chat");
  const settingsFaqItems = root.querySelector(".cfw-js-settings-faq-items");
  const messages = root.querySelector(".cfw-messages");
  const typing = root.querySelector(".cfw-typing");
  const footer = root.querySelector(".cfw-footer");
  const note = root.querySelector(".cfw-note");
  const chatMode = root.querySelector(".cfw-js-chat-mode");
  const statusIndicator = root.querySelector(".cfw-js-status-indicator");

  const emojiTrigger = root.querySelector(".cfw-js-emoji-trigger");
  const emojiPicker = root.querySelector(".cfw-emoji-picker");
  const uploadTrigger = root.querySelector(".cfw-js-upload-trigger");
  const fileInput = root.querySelector(".cfw-js-file-input");
  const iconChat = root.querySelector(".cfw-js-icon-chat");
  const iconClose = root.querySelector(".cfw-js-icon-close");
  const fabBadge = root.querySelector(".cfw-js-fab-badge");
  const pendingAttachmentsWrap = root.querySelector(
    ".cfw-js-pending-attachments",
  );
  const faqSearch = root.querySelector(".cfw-js-faq-search");

  let pendingAttachments = [];

  const keepPanelOpen = () => {
    panel.classList.add("cfw-visible");
    iconChat.classList.add("cfw-hidden");
    iconClose.classList.remove("cfw-hidden");
  };

  const clearPendingAttachments = () => {
    pendingAttachments.forEach((item) => {
      if (item?.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
    });
    pendingAttachments = [];
    renderPendingAttachments();
  };

  const renderPendingAttachments = () => {
    if (!pendingAttachmentsWrap) return;
    pendingAttachmentsWrap.innerHTML = "";
    pendingAttachmentsWrap.classList.toggle(
      "cfw-hidden",
      pendingAttachments.length === 0,
    );
    pendingAttachments.forEach((item) => {
      const row = document.createElement("div");
      row.className = "cfw-pending-item";

      if (item.previewUrl) {
        const thumb = document.createElement("img");
        thumb.className = "cfw-pending-thumb";
        thumb.src = item.previewUrl;
        thumb.alt = item.file?.name || "attachment";
        row.appendChild(thumb);
      }

      const name = document.createElement("span");
      name.className = "cfw-pending-name";
      name.textContent = item.file?.name || "Attachment";
      row.appendChild(name);

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "cfw-pending-remove";
      removeBtn.textContent = "x";
      removeBtn.title = "Remove";
      removeBtn.onclick = () => {
        if (item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
        pendingAttachments = pendingAttachments.filter((x) => x.id !== item.id);
        renderPendingAttachments();
      };
      row.appendChild(removeBtn);
      pendingAttachmentsWrap.appendChild(row);
    });
  };

  fab.onclick = () => {
    const isVisible = panel.classList.contains("cfw-visible");
    panel.classList.toggle("cfw-visible", !isVisible);
    iconChat.classList.toggle("cfw-hidden", !isVisible);
    iconClose.classList.toggle("cfw-hidden", isVisible);
    if (!isVisible) {
      clearTransientFaqConversation();
      state.unreadCount = 0;
      renderFabUnreadBadge();
      handlers.onOpen();
      if (typeof state.pollingControls?.start === "function") {
        state.pollingControls.start();
      }
    } else {
      if (typeof state.pollingControls?.stop === "function") {
        state.pollingControls.stop();
      }
      clearTransientFaqConversation();
      setSettingsVisible(false);
    }
  };

  if (headerCloseBtn) {
    headerCloseBtn.onclick = () => {
      clearTransientFaqConversation();
      setSettingsVisible(false);
      panel.classList.remove("cfw-visible");
      iconChat.classList.remove("cfw-hidden");
      iconClose.classList.add("cfw-hidden");
    };
  }

  if (settingsBtn) {
    settingsBtn.onclick = () => openFaqSettingsTab();
  }

  if (homeBackBtn) {
    homeBackBtn.onclick = () => {
      state.localFaqChat = [];
      setSettingsVisible(false);
      renderMessages();
      updateHeaderActionsState();
    };
  }

  if (settingsBackBtn)
    settingsBackBtn.onclick = () => setSettingsVisible(false);

  if (leaveChatBtn) {
    leaveChatBtn.onclick = () => {
      const confirmed = window.confirm(
        "Are you sure you want to leave this chat?",
      );
      if (!confirmed) return;
      handlers.onLeaveChat();
    };
  }

  if (moveBtn) moveBtn.onclick = () => handlers.onMove();

  if (faqSearch) {
    faqSearch.oninput = () => {
      renderFaqItems(settingsFaqItems, faqSearch.value);
    };
  }

  sendBtn.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();

    const text = input.value;
    const hasText = text.trim().length > 0;
    const hasAttachments = pendingAttachments.length > 0;
    if (!hasText && !hasAttachments) return;

    keepPanelOpen();
    const files = pendingAttachments.map((item) => item.file).filter(Boolean);

    sendBtn.disabled = true;
    state.isSendingMessage = true;
    renderMessages();
    try {
      const sent = await handlers.onSend(text, files);
      if (sent !== false) {
        input.value = "";
        clearPendingAttachments();
      }
    } catch (error) {
      showStatus(error?.message || "Unable to send message right now.");
    } finally {
      keepPanelOpen();
      state.isSendingMessage = false;
      renderMessages();
      sendBtn.disabled = false;
    }
  });

  input.onkeydown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      sendBtn.click();
    }
  };

  input.oninput = () => {
    const hasText = input.value.trim().length > 0;
    handlers.onTyping(hasText);
  };

  if (emojiTrigger && emojiPicker) {
    emojiPicker.addEventListener("click", (e) => {
      e.stopPropagation();
    });

    emojiTrigger.onclick = (e) => {
      e.stopPropagation();
      const isHidden = emojiPicker.classList.contains("cfw-hidden");
      if (isHidden) {
        mountEmojiPicker(emojiPicker, (emoji) => {
          input.value += emoji;
          input.focus();
        });
      }
      emojiPicker.classList.toggle("cfw-hidden", !isHidden);
    };

    document.addEventListener("click", () => {
      emojiPicker.classList.add("cfw-hidden");
      document.querySelectorAll(".cfw-msg-dropdown").forEach((menu) => {
        menu.classList.add("cfw-hidden");
      });
    });
  }

  if (uploadTrigger && fileInput) {
    uploadTrigger.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      keepPanelOpen();
      // Safe default allowlist; backend also validates.
      fileInput.accept =
        "image/*,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      fileInput.click();
    };

    fileInput.onchange = async () => {
      const files = Array.from(fileInput.files || []);
      if (files.length === 0) return;
      keepPanelOpen();
      state.localFaqChat = [];

      const maxBytes = 25 * 1024 * 1024;
      files.forEach((file) => {
        if (file.size > maxBytes) {
          showStatus(
            `File too large: ${file.name}. Max allowed size is 25MB.`,
          );
          return;
        }
        const isImage = String(file.type || "").startsWith("image/");
        pendingAttachments.push({
          id: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
          file,
          previewUrl: isImage ? URL.createObjectURL(file) : "",
        });
      });
      renderPendingAttachments();
      showStatus(`${files.length} attachment(s) added. Click send to send.`);
      fileInput.value = "";
    };
  }

  return {
    root,
    elements: {
      panel,
      fab,
      headerSub,
      input,
      sendBtn,
      settingsWrap,
      settingsBtn,
      homeBackBtn,
      settingsFaqItems,
      messages,
      typing,
      footer,
      note,
      chatMode,
      statusIndicator,
      fabBadge,
      faqSearch,
    },
  };
}
