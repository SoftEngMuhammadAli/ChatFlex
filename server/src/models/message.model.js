import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      // Optional for direct messages
      required: false,
    },
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
    },
    senderType: {
      type: String,
      enum: ["visitor", "agent", "ai", "owner"],
      required: true,
    },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // User ID for owner/agent
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // For direct messages
    content: { type: String, required: true },
    attachments: [
      {
        url: { type: String },
        type: { type: String },
        name: { type: String },
        size: { type: Number },
      },
    ],
    readAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const Message = mongoose.model("Message", MessageSchema);
