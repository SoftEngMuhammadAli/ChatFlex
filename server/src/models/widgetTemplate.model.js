import mongoose from "mongoose";
import crypto from "crypto";

const WidgetTemplateSchema = new mongoose.Schema(
  {
    // widget name
    name: { type: String, required: true, trim: true },
    // brand color
    brandColor: { type: String, default: "#0f766e" },
    // widget position
    position: { type: String, enum: ["left", "right"], default: "right" },
    // widget title
    title: { type: String, default: "Support Concierge" },
    // widget subtitle
    subtitle: { type: String, default: "Most first responses arrive in under 5 minutes during business hours" },
    // widget welcome message
    welcomeMessage: {
      type: String,
      default:
        "Hi there! Tell us what you need and we will connect you to the right specialist.",
    },
    // widget logo url
    logoUrl: { type: String, default: "" },
    // widget width
    width: { type: Number, min: 220, max: 360, default: 360 },
    // widget height
    height: { type: Number, min: 300, max: 640, default: 560 },
    // widget text color
    textColor: { type: String, default: "#0f172a" },
    // widget background color
    backgroundColor: { type: String, default: "#FFFFFF" },
    // widget suggested messages
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
    // widget faq items
    faqItems: {
      type: [
        {
          question: { type: String },
          answer: { type: String },
          category: { type: String, default: "General" },
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
    // show emojis
    showEmojis: { type: Boolean, default: true },
    // allow file uploads
    allowFileUploads: { type: Boolean, default: true },
    // allow collecting visitor details independently
    isLogged: { type: Boolean, default: false },
    // allowed user email
    allowedUserEmail: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },
    // pre-chat form
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
            isDefault: { type: Boolean, default: false },
          },
        ],
        default: () => [
          { key: "sales", label: "Sales", isDefault: true },
          { key: "support", label: "Support", isDefault: false },
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
    // widget access token
    accessToken: {
      type: String,
      required: true,
      default: () => crypto.randomBytes(24).toString("hex"),
      select: false,
    },
    // Created By -> User - Role
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Workspace scope for multi-tenant isolation
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      default: null,
      index: true,
    },
  },
  { timestamps: true },
);

export const WidgetTemplate = mongoose.model(
  "WidgetTemplate",
  WidgetTemplateSchema,
);
