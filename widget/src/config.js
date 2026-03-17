import { DEFAULTS } from "./state.js";
import { normalizeHost } from "./utils.js";

const normalizeSuggestedMessageText = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ");

const normalizeDepartmentOption = (item, index) => {
  const key = String(item?.key || item?.value || item?.label || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
  const label =
    String(item?.label || item?.name || "")
      .trim() || key.replace(/-/g, " ");
  if (!key || !label) return null;
  return {
    key,
    label,
    isDefault: item?.isDefault === true || index === 0,
  };
};

const normalizeDepartmentSelection = (selection) => {
  const options = Array.isArray(selection?.options)
    ? selection.options.map(normalizeDepartmentOption).filter(Boolean)
    : [];
  return {
    enabled: selection?.enabled === true,
    options:
      options.length > 0
        ? options
        : DEFAULTS.departmentSelection.options.map((item) => ({ ...item })),
  };
};

const getBrowserLanguage = () => {
  try {
    const raw =
      (typeof navigator !== "undefined" && navigator.language) || "en";
    return String(raw).trim().toLowerCase().split(/[-_]/)[0] || "en";
  } catch {
    return "en";
  }
};

export const normalizeSuggestedMessages = (suggestedMessages, faqItems = []) => {
  if (!Array.isArray(suggestedMessages)) return [];

  const faqAnswerByQuestion = new Map(
    (Array.isArray(faqItems) ? faqItems : [])
      .map((item) => ({
        question: normalizeSuggestedMessageText(item?.question).toLowerCase(),
        answer: normalizeSuggestedMessageText(item?.answer),
      }))
      .filter((item) => item.question && item.answer)
      .map((item) => [item.question, item.answer]),
  );

  return suggestedMessages
    .map((item) => {
      if (typeof item === "string") {
        const message = normalizeSuggestedMessageText(item);
        if (!message) return null;
        return {
          message,
          answer:
            faqAnswerByQuestion.get(message.toLowerCase()) ||
            "Thanks for your message. A support agent will assist you shortly.",
        };
      }

      if (!item || typeof item !== "object") return null;
      const message = normalizeSuggestedMessageText(
        item.message || item.text || item.question || "",
      );
      if (!message) return null;

      const answer =
        normalizeSuggestedMessageText(item.answer || item.reply || "") ||
        faqAnswerByQuestion.get(message.toLowerCase()) ||
        "Thanks for your message. A support agent will assist you shortly.";

      return { message, answer };
    })
    .filter(Boolean);
};

export function mergeOptions(input) {
  const inputTheme = input.theme || {};
  const inputWindow = inputTheme.chatWindow || {};
  const normalizedFaqItems = Array.isArray(input.faqItems)
    ? input.faqItems
    : DEFAULTS.faqItems;
  const normalizedSuggestedMessages = normalizeSuggestedMessages(
    Array.isArray(input.suggestedMessages)
      ? input.suggestedMessages
      : DEFAULTS.suggestedMessages,
    normalizedFaqItems,
  );
  const normalizedDepartmentSelection = normalizeDepartmentSelection(
    input.departmentSelection || DEFAULTS.departmentSelection,
  );
  const browserLanguage = getBrowserLanguage();
  return {
    apiHost: normalizeHost(input.apiHost),
    apiKey: input.apiKey,
    widgetId: input.widgetId || "",
    widgetToken: input.widgetToken || "",
    hasCustomTitle: Boolean(input.title),
    hasCustomSubtitle: Boolean(input.subtitle),
    hasCustomWelcomeMessage: Boolean(input.welcomeMessage),
    hasCustomStartConversationMessage: Boolean(input.startConversationMessage),
    hasCustomLogoUrl: Boolean(input.logoUrl),
    hasCustomPosition: input.position === "left",
    hasCustomSuggestedMessages: Array.isArray(input.suggestedMessages),
    hasCustomAutoReplySuggestions:
      typeof input.autoReplySuggestions === "boolean",
    visitorName: input.visitorName || "Website Visitor",
    visitorEmail: input.visitorEmail || "",
    restrictedVisitorEmail: input.restrictedVisitorEmail || "",
    title: input.title || DEFAULTS.title,
    subtitle: input.subtitle || DEFAULTS.subtitle,
    welcomeMessage: input.welcomeMessage || DEFAULTS.welcomeMessage,
    startConversationMessage:
      input.startConversationMessage || DEFAULTS.startConversationMessage,
    logoUrl: input.logoUrl || DEFAULTS.logoUrl,
    position: input.position === "left" ? "left" : DEFAULTS.position,
    allowVisitorPositionToggle:
      input.allowVisitorPositionToggle !== false &&
      DEFAULTS.allowVisitorPositionToggle,
    pollIntervalMs: Number(input.pollIntervalMs) || DEFAULTS.pollIntervalMs,
    faqItems: normalizedFaqItems,
    autoReplySuggestions:
      typeof input.autoReplySuggestions === "boolean"
        ? input.autoReplySuggestions
        : DEFAULTS.autoReplySuggestions,
    suggestedMessages: normalizedSuggestedMessages,
    showFaqs: input.showFaqs ?? DEFAULTS.showFaqs,
    theme: {
      primary: inputTheme.primary || DEFAULTS.theme.primary,
      text: inputTheme.text || DEFAULTS.theme.text,
      background: inputTheme.background || DEFAULTS.theme.background,
      chatWindow: {
        width: Number(inputWindow.width) || DEFAULTS.theme.chatWindow.width,
        height: Number(inputWindow.height) || DEFAULTS.theme.chatWindow.height,
      },
    },
    showEmojis: input.showEmojis ?? DEFAULTS.showEmojis,
    allowFileUploads: input.allowFileUploads ?? DEFAULTS.allowFileUploads,
    offlineMode: input.offlineMode ?? DEFAULTS.offlineMode,
    departmentSelection: normalizedDepartmentSelection,
    businessHours: input.businessHours || DEFAULTS.businessHours,
    metadata: {
      ...(input.metadata || {}),
      email: input.visitorEmail || input.metadata?.email || "",
      language: input.metadata?.language || browserLanguage,
    },
    preChatForm: input.preChatForm || DEFAULTS.preChatForm,
  };
}
