const mongoose = require("mongoose");

const faqSchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    question: { type: String, required: true, trim: true },
    answer: { type: String, required: true, trim: true },
    category: { type: String, default: "general", trim: true },
    status: { type: String, enum: ["published", "draft"], default: "published" },
    version: { type: Number, default: 1 }
  },
  { timestamps: true }
);

module.exports = mongoose.model("FAQ", faqSchema);
