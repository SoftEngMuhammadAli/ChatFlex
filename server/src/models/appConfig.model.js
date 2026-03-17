import mongoose from "mongoose";
import crypto from "crypto";

const AppConfigSchema = new mongoose.Schema(
  {
    appName: { type: String, default: "ChatFlex" },
    widgetApiKey: {
      type: String,
      default: () =>
        process.env.CHATFLEX_WIDGET_API_KEY ||
        process.env.WIDGET_API_KEY ||
        crypto.randomUUID(),
      unique: true,
    },
    widgetSettings: {
      brandColor: { type: String, default: "#0f766e" },
      logoUrl: { type: String, default: "" },
      welcomeMessage: {
        type: String,
        default:
          "Hi there! Tell us what you need and we will connect you to the right specialist.",
      },
      position: { type: String, enum: ["left", "right"], default: "right" },
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
          },
        ],
        default: () => [
          {
            question: "What are your support hours?",
            answer:
              "Our team is available Monday to Friday, 9 AM to 6 PM local time.",
            category: "General",
          },
          {
            question: "How quickly will I get a reply?",
            answer:
              "Most conversations receive a first response in under 5 minutes during business hours.",
            category: "General",
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
    },
    limits: {
      conversationsPerMonth: { type: Number, default: 50000 },
      aiTokens: { type: Number, default: 5000000 },
    },
    globalModelConfig: {
      model: { type: String, trim: true, default: "gpt-4o-mini" },
      temperature: { type: Number, default: 0.3, min: 0, max: 2 },
      maxTokens: { type: Number, default: 1024, min: 64, max: 16384 },
      systemPrompt: { type: String, trim: true, default: "" },
    },
  },
  { timestamps: true },
);

export const AppConfig = mongoose.model("AppConfig", AppConfigSchema);
