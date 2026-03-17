export const DEFAULTS = {
  position: "right",
  title: "Support Concierge",
  subtitle: "Most first responses arrive in under 5 minutes during business hours",
  welcomeMessage:
    "Hi there! Tell us what you need and we will connect you to the right specialist.",
  startConversationMessage: "Hi, I need some help.",
  logoUrl: "",
  pollIntervalMs: 4000,
  allowVisitorPositionToggle: true,
  faqItems: [
    {
      question: "What are your support hours?",
      answer: "Our team is available Monday to Friday, 9 AM to 6 PM local time.",
      category: "General",
      status: "published",
    },
    {
      question: "How quickly will I get a reply?",
      answer: "Most conversations receive a first response in under 5 minutes during business hours.",
      category: "General",
      status: "published",
    },
  ],
  autoReplySuggestions: true,
  suggestedMessages: [
    {
      message: "What are your pricing plans?",
      answer:
        "We offer Starter, Growth, and Pro plans. Share your monthly conversation volume and we can guide you.",
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
  showFaqs: true,
  theme: {
    primary: "#0f766e",
    text: "#1f2937",
    background: "#ffffff",
    chatWindow: { width: 360, height: 560 },
  },
  showEmojis: true,
  allowFileUploads: true,
  preChatForm: {
    enabled: false,
    fields: [],
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
  offlineMode: false,
};

export const state = {
  initialized: false,
  options: null,
  visitorId: null,
  visitorUserId: null,
  socketToken: "",
  conversationId: null,
  forceNewConversation: false,
  workspaceId: null,
  assignedAgentId: null,
  socket: null,
  socketJoined: false,
  onUserStatusChange: null,
  onTypingStatusChange: null,
  pollTimer: null,
  typingStopTimer: null,
  isLocalTyping: false,
  isAgentTyping: false,
  unreadCount: 0,
  socketStatus: "disconnected",
  lastMessageAt: null,
  root: null,
  elements: {},
  messages: [],
  faqItems: [],
  // Temporary FAQ chat — never persisted, cleared on leave/refresh
  localFaqChat: [],
  preChatFormSubmitted: false,
  isSendingMessage: false,
  detectedLanguage: "en",
  isOffline: false,
  messageActions: null,
};
