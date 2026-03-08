const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema(
  {
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true, trim: true }
  },
  { timestamps: true }
);

const conversationSchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    visitor: {
      name: { type: String, default: "Visitor" },
      email: { type: String, default: "" },
      country: { type: String, default: "" },
      ip: { type: String, default: "" },
      pageUrl: { type: String, default: "" }
    },
    status: { type: String, enum: ["open", "pending", "resolved"], default: "open", index: true },
    department: { type: String, default: "support", index: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    tags: [{ type: String, trim: true, index: true }],
    notes: [noteSchema],
    lockedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    lockedUntil: { type: Date },
    firstRespondedAt: { type: Date },
    resolvedAt: { type: Date }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Conversation", conversationSchema);
