const mongoose = require("mongoose");

const workspaceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    plan: {
      type: String,
      enum: ["starter", "team", "pro", "enterprise"],
      default: "starter"
    },
    settings: {
      brandColor: { type: String, default: "#0F766E" },
      logoUrl: { type: String, default: "" },
      welcomeMessage: { type: String, default: "Hi, how can we help you today?" },
      widgetPosition: { type: String, enum: ["left", "right"], default: "right" },
      aiMode: { type: String, enum: ["disabled", "faq-first", "hybrid"], default: "hybrid" }
    },
    limits: {
      conversationsPerMonth: { type: Number, default: 500 },
      aiTokensPerMonth: { type: Number, default: 100000 },
      agentSeats: { type: Number, default: 1 },
      knowledgeSources: { type: Number, default: 20 }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Workspace", workspaceSchema);
