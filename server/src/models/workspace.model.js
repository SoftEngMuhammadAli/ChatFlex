import mongoose from "mongoose";
import crypto from "crypto";

const workspaceLimitsSchema = new mongoose.Schema(
  {
    conversationsPerMonth: { type: Number, default: 50000 },
    aiTokens: { type: Number, default: 5000000 },
    agentSeats: { type: Number, default: 5 },
  },
  { _id: false },
);

const workspaceBrandSettingsSchema = new mongoose.Schema(
  {
    brandColor: { type: String, default: "#0f766e" },
    logoUrl: { type: String, default: "" },
    welcomeMessage: {
      type: String,
      default:
        "Hi there! Tell us what you need and we will connect you to the right specialist.",
    },
    position: { type: String, enum: ["left", "right"], default: "right" },
    showEmojis: { type: Boolean, default: true },
    allowFileUploads: { type: Boolean, default: true },
    offlineMode: { type: Boolean, default: false },
    widget: {
      title: { type: String, default: "Support Concierge" },
      subtitle: {
        type: String,
        default: "Most first responses arrive in under 5 minutes during business hours",
      },
      width: { type: Number, default: 360 },
      height: { type: Number, default: 560 },
      textColor: { type: String, default: "#1f2937" },
      backgroundColor: { type: String, default: "#ffffff" },
    },
    faqItems: {
      type: [
        {
          question: { type: String },
          answer: { type: String },
          category: { type: String },
          status: {
            type: String,
            enum: ["published", "unpublished"],
            default: "published",
          },
        },
      ],
      default: () => [
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
      ],
    },
    showFaqs: { type: Boolean, default: true },
    autoReplySuggestions: { type: Boolean, default: true },
    suggestedMessages: {
      type: [mongoose.Schema.Types.Mixed],
      default: () => [
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
    },
    preChatForm: {
      enabled: { type: Boolean, default: false },
      fields: [
        {
          label: { type: String, required: true },
          type: {
            type: String,
            enum: ["text", "email", "number", "textarea"],
            default: "text",
          },
          required: { type: Boolean, default: true },
          placeholder: { type: String, default: "" },
        },
      ],
    },
    departmentSelection: {
      enabled: { type: Boolean, default: false },
      options: {
        type: [
          {
            key: { type: String, trim: true },
            label: { type: String, trim: true },
            routingTags: [{ type: String, trim: true }],
            isDefault: { type: Boolean, default: false },
          },
        ],
        default: () => [
          { key: "sales", label: "Sales", routingTags: ["sales"], isDefault: true },
          { key: "support", label: "Support", routingTags: ["support"], isDefault: false },
        ],
      },
    },
    businessHours: {
      enabled: { type: Boolean, default: false },
      timezone: { type: String, default: "UTC", trim: true },
      weekdays: {
        type: [Number],
        default: () => [1, 2, 3, 4, 5],
      },
      startTime: { type: String, default: "09:00", trim: true },
      endTime: { type: String, default: "18:00", trim: true },
      autoReplyEnabled: { type: Boolean, default: true },
      autoReplyMessage: {
        type: String,
        default:
          "Thanks for reaching out. Our team is currently offline, but we have received your message and will reply in business hours.",
      },
    },
  },
  { _id: false },
);

const workspaceAiSettingsSchema = new mongoose.Schema(
  {
    mode: {
      type: String,
      enum: ["disabled", "faq-first", "hybrid", "ai-only"],
      default: "faq-first",
    },
    escalationEnabled: { type: Boolean, default: true },
    fallbackMessage: {
      type: String,
      default: "I can connect you with a human agent for this request.",
    },
    brandTone: {
      type: String,
      default: "professional",
      trim: true,
    },
    confidenceThreshold: {
      type: Number,
      default: 0.6,
      min: 0,
      max: 1,
    },
    autoDetectLanguage: { type: Boolean, default: true },
    responseLanguage: {
      type: String,
      default: "auto",
      trim: true,
    },
    knowledgeSources: {
      manualFaqEnabled: { type: Boolean, default: true },
      manualQnA: [
        {
          question: { type: String, trim: true },
          answer: { type: String, trim: true },
          tags: [{ type: String, trim: true }],
          updatedAt: { type: Date, default: Date.now },
        },
      ],
      websiteUrls: [{ type: String, trim: true }],
      websitePages: [
        {
          url: { type: String, trim: true },
          title: { type: String, trim: true },
          content: { type: String, trim: true },
          indexingStatus: {
            type: String,
            enum: ["queued", "indexed", "failed"],
            default: "queued",
          },
          indexedAt: { type: Date, default: null },
          error: { type: String, trim: true, default: "" },
        },
      ],
      pdfFiles: [
        {
          name: { type: String, trim: true },
          url: { type: String, trim: true },
          uploadedAt: { type: Date, default: Date.now },
          extractedText: { type: String, trim: true, default: "" },
          indexingStatus: {
            type: String,
            enum: ["queued", "indexed", "failed"],
            default: "queued",
          },
          indexedAt: { type: Date, default: null },
          error: { type: String, trim: true, default: "" },
        },
      ],
    },
    model: { type: String, default: "" },
    temperature: { type: Number, default: 0.3 },
  },
  { _id: false },
);

const workspaceSuspensionSchema = new mongoose.Schema(
  {
    isSuspended: { type: Boolean, default: false },
    reason: { type: String, trim: true, default: "" },
    suspendedAt: { type: Date, default: null },
    suspendedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    unsuspendedAt: { type: Date, default: null },
  },
  { _id: false },
);

const workspaceAbuseMonitoringSchema = new mongoose.Schema(
  {
    score: { type: Number, default: 0, min: 0, max: 100 },
    level: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "low",
    },
    flags: {
      type: [String],
      default: () => [],
    },
    lastScannedAt: { type: Date, default: null },
  },
  { _id: false },
);

const WorkspaceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    plan: {
      type: String,
      default: "starter",
      trim: true,
    },
    limits: {
      type: workspaceLimitsSchema,
      default: () => ({
        conversationsPerMonth: 50000,
        aiTokens: 5000000,
        agentSeats: 5,
      }),
    },
    apiKey: {
      type: String,
      unique: true,
      index: true,
      default: () =>
        process.env.CHATFLEX_WIDGET_API_KEY ||
        process.env.WIDGET_API_KEY ||
        crypto.randomUUID(),
    },
    allowedDomains: [{ type: String, trim: true, lowercase: true }],
    brandSettings: {
      type: workspaceBrandSettingsSchema,
      default: () => ({}),
    },
    aiSettings: {
      type: workspaceAiSettingsSchema,
      default: () => ({}),
    },
    status: {
      type: String,
      enum: ["active", "suspended"],
      default: "active",
      index: true,
    },
    suspension: {
      type: workspaceSuspensionSchema,
      default: () => ({}),
    },
    abuseMonitoring: {
      type: workspaceAbuseMonitoringSchema,
      default: () => ({}),
    },
  },
  { timestamps: true },
);

export const Workspace = mongoose.model("Workspace", WorkspaceSchema);
