import { THEME_COLORS } from "../styles/globalThemeTokens";

export const DEFAULT_WIDGET_TITLE = "Support Concierge";

export const WIDGET_SIZE_LIMITS = {
  width: { min: 220, max: 360 },
  height: { min: 300, max: 640 },
};

export const clampWidgetDimension = (dimension, value) => {
  const limits = WIDGET_SIZE_LIMITS[dimension];
  if (!limits) return Number(value || 0);
  const numericValue = Number(value || 0);
  if (!Number.isFinite(numericValue)) return limits.min;
  return Math.min(Math.max(numericValue, limits.min), limits.max);
};

export const defaultWidgetTemplateForm = {
  name: "",
  brandColor: THEME_COLORS.toastReceive,
  position: "right",
  title: DEFAULT_WIDGET_TITLE,
  subtitle: "Most first responses arrive in under 5 minutes during business hours",
  welcomeMessage:
    "Hi there! Tell us what you need and we will connect you to the right specialist.",
  logoUrl: "",
  width: 360,
  height: 560,
  textColor: THEME_COLORS.slate900,
  backgroundColor: THEME_COLORS.bgWhite,
  isLogged: false,
  allowedUserEmail: "",
  autoReplySuggestions: true,
  suggestedMessages: [
    {
      message: "What are your pricing plans?",
      answer:
        "We offer Starter, Growth, and Pro plans. Share your monthly conversation volume and I can guide you to the best fit.",
    },
    {
      message: "How fast can I get a response?",
      answer:
        "During business hours most first responses are sent in under 5 minutes.",
    },
    {
      message: "Can I talk to a human agent?",
      answer:
        "Yes. Click Start Live Chatting and we will connect you with an available agent.",
    },
    {
      message: "Do you support file sharing?",
      answer:
        "Yes, file uploads can be enabled in widget settings for visitors to share screenshots and documents.",
    },
    {
      message: "How do I track my support request?",
      answer:
        "Share your ticket or order reference and our team will check the latest status for you.",
    },
  ],
  faqItems: [
    {
      question: "What are your support hours?",
      answer:
        "Our team is available Monday to Friday, 9 AM to 6 PM local time.",
      category: "General",
      status: "published",
    },
    {
      question: "How quickly will I get a reply?",
      answer:
        "Most conversations receive a first response in under 5 minutes during business hours.",
      category: "General",
      status: "published",
    },
    {
      question: "Can I talk to a human?",
      answer:
        "Absolutely! If our bot can't assist you, it will connect you to one of our human agents.",
      category: "General",
      status: "published",
    },
    {
      question: "What information should I provide?",
      answer:
        "To help us assist you better, please provide details about your issue, any error messages you've received, and the steps you've already taken to resolve it.",
      category: "General",
      status: "published",
    },
    {
      question: "Is my information secure?",
      answer:
        "Yes, we take your privacy seriously. All information you share with us is encrypted and stored securely. We do not share your information with third parties without your consent.",
      category: "General",
      status: "published",
    },
  ],
  showFaqs: true,
  showEmojis: true,
  allowFileUploads: true,
  preChatForm: {
    enabled: false,
    fields: [
      {
        label: "Name",
        type: "text",
        required: true,
        placeholder: "Jane Doe",
      },
      {
        label: "Email",
        type: "email",
        required: true,
        placeholder: "jane@company.com",
      },
    ],
  },
  departmentSelection: {
    enabled: false,
    options: [
      { key: "sales", label: "Sales", isDefault: true },
      { key: "support", label: "Support", isDefault: false },
    ],
  },
  businessHours: {
    enabled: false,
    timezone: "UTC",
    weekdays: [1, 2, 3, 4, 5],
    startTime: "09:00",
    endTime: "18:00",
    autoReplyEnabled: true,
    autoReplyMessage:
      "Thanks for reaching out. Our team is currently offline, but we have received your message and will reply in business hours.",
  },
};

// Normalize suggested message text by trimming and collapsing whitespace
// This ensures consistent formatting regardless of input variations
// normalizing means we will convert multiple spaces into a single space, and remove leading/trailing spaces
const normalizeSuggestedMessageText = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ");

export const toSuggestedMessageEntry = (item) => {
  if (typeof item === "string") {
    const message = normalizeSuggestedMessageText(item);
    return message
      ? {
          message,
          answer: "",
        }
      : null;
  }

  if (!item || typeof item !== "object") return null;

  const message = normalizeSuggestedMessageText(
    item.message || item.text || item.question || "",
  );
  const answer = normalizeSuggestedMessageText(item.answer || item.reply || "");

  if (!message) return null;
  return { message, answer };
};

export const sanitizeSuggestedMessages = (suggestedMessages = []) =>
  (Array.isArray(suggestedMessages) ? suggestedMessages : [])
    .map(toSuggestedMessageEntry)
    .filter(Boolean);

// Resolve Widget Display Title - prioritize name over title, and default if neither provided
export const resolveWidgetDisplayTitle = (input = {}) => {
  const name = String(input?.name || "").trim();
  const title = String(input?.title || "").trim();
  const isDefaultTitle =
    title.toLowerCase() === DEFAULT_WIDGET_TITLE.toLowerCase();

  if (name) return name;
  if (title && !isDefaultTitle) return title;
  return DEFAULT_WIDGET_TITLE;
};

// get widget template id - we have normalized it
export const getWidgetTemplateId = (item) =>
  String(item?._id || item?.id || "");
