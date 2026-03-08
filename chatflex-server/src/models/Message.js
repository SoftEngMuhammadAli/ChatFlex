const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true
    },
    senderType: { type: String, enum: ["visitor", "agent", "ai", "system"], required: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    content: { type: String, required: true, trim: true },
    attachments: [{ name: String, url: String, size: Number }]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", messageSchema);
