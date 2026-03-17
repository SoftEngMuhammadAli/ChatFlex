import mongoose from "mongoose";

const WorkflowTaskSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: false,
      index: true,
    },
    taskType: {
      type: String,
      enum: [
        "sla-reminder",
        "escalation-check",
        "post-resolution-followup",
        "notification-reminder",
        "daily-digest",
      ],
      required: true,
      index: true,
    },
    dueAt: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed", "cancelled"],
      default: "pending",
      index: true,
    },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 3 },
    lastError: { type: String, default: "" },
    processedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

WorkflowTaskSchema.index({ status: 1, dueAt: 1 });
WorkflowTaskSchema.index({ workspaceId: 1, taskType: 1, dueAt: 1 });

export const WorkflowTask = mongoose.model("WorkflowTask", WorkflowTaskSchema);

