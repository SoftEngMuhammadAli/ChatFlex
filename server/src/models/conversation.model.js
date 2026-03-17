import mongoose from "mongoose";

const ConversationSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
    },
    visitorId: { type: String, required: true },
    visitorUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    status: {
      type: String,
      enum: ["open", "pending", "resolved", "escalated"],
      default: "open",
    },
    assignedAgent: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    department: { type: String, trim: true, default: "" },
    initiatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    tags: [{ type: String }],
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    internalNotes: [
      {
        authorId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        content: { type: String, required: true, trim: true },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
      },
    ],
    typingLock: {
      lockedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      lockedAt: { type: Date, default: null },
      expiresAt: { type: Date, default: null },
    },
    lastMessageAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

ConversationSchema.pre("save", function (next) {
  if (this.assignedAgent && !this.assignedTo) {
    this.assignedTo = this.assignedAgent;
  }
  if (this.assignedTo && !this.assignedAgent) {
    this.assignedAgent = this.assignedTo;
  }
  next();
});

const syncAssignedAgentAndAssignedTo = function (next) {
  const update = this.getUpdate() || {};
  const $set = update.$set || {};

  if ($set.assignedTo && !$set.assignedAgent) {
    $set.assignedAgent = $set.assignedTo;
  }
  if ($set.assignedAgent && !$set.assignedTo) {
    $set.assignedTo = $set.assignedAgent;
  }

  if (update.assignedTo && !update.assignedAgent) {
    update.assignedAgent = update.assignedTo;
  }
  if (update.assignedAgent && !update.assignedTo) {
    update.assignedTo = update.assignedAgent;
  }

  if (Object.keys($set).length > 0) {
    update.$set = $set;
  }

  this.setUpdate(update);
  next();
};

ConversationSchema.pre("findOneAndUpdate", syncAssignedAgentAndAssignedTo);
ConversationSchema.pre("updateOne", syncAssignedAgentAndAssignedTo);
ConversationSchema.pre("updateMany", syncAssignedAgentAndAssignedTo);
ConversationSchema.index({ workspaceId: 1, status: 1, lastMessageAt: -1 });
ConversationSchema.index({ workspaceId: 1, assignedTo: 1, lastMessageAt: -1 });
ConversationSchema.index({ workspaceId: 1, department: 1, lastMessageAt: -1 });
ConversationSchema.index({ workspaceId: 1, "typingLock.expiresAt": 1 });

export const Conversation = mongoose.model("Conversation", ConversationSchema);
