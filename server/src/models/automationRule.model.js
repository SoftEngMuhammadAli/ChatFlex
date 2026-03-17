import mongoose from "mongoose";

const automationConditionSchema = new mongoose.Schema(
  {
    statusIn: [{ type: String, trim: true, lowercase: true }],
    departmentIn: [{ type: String, trim: true, lowercase: true }],
    tagsAny: [{ type: String, trim: true, lowercase: true }],
    containsAny: [{ type: String, trim: true }],
    senderTypeIn: [{ type: String, trim: true, lowercase: true }],
    priorityIn: [{ type: String, trim: true, lowercase: true }],
  },
  { _id: false },
);

const automationActionSchema = new mongoose.Schema(
  {
    assignMode: {
      type: String,
      enum: ["none", "specific-agent", "round-robin", "department-round-robin"],
      default: "none",
    },
    assignUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    addTags: [{ type: String, trim: true, lowercase: true }],
    removeTags: [{ type: String, trim: true, lowercase: true }],
    setPriority: { type: String, trim: true, lowercase: true, default: "" },
    setDepartment: { type: String, trim: true, lowercase: true, default: "" },
    setSlaMinutes: { type: Number, default: 0 },
    createReminderMinutesBefore: { type: Number, default: 0 },
    escalateAfterMinutes: { type: Number, default: 0 },
    followUpDelayMinutes: { type: Number, default: 0 },
    followUpMessage: { type: String, trim: true, default: "" },
    notifyRoles: [{ type: String, trim: true, lowercase: true }],
  },
  { _id: false },
);

const AutomationRuleSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    trigger: {
      type: String,
      enum: [
        "conversation_created",
        "visitor_message",
        "agent_message",
        "conversation_resolved",
        "sla_due",
        "manual",
      ],
      required: true,
    },
    enabled: { type: Boolean, default: true, index: true },
    priority: { type: Number, default: 100, min: 1, max: 1000 },
    conditions: {
      type: automationConditionSchema,
      default: () => ({}),
    },
    actions: {
      type: automationActionSchema,
      default: () => ({}),
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
  },
  { timestamps: true },
);

AutomationRuleSchema.index({ workspaceId: 1, trigger: 1, enabled: 1, priority: 1 });

export const AutomationRule = mongoose.model("AutomationRule", AutomationRuleSchema);

