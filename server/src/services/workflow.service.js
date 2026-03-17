import { WorkflowTask } from "../models/workflowTask.model.js";
import { Conversation } from "../models/conversation.model.js";
import { Message } from "../models/message.model.js";
import { dispatchIntegrationEvent } from "./integration.service.js";
import { pickRoundRobinAgent } from "./routing.service.js";
import {
  notifyUsersByRoles,
  sendDailyDigestForWorkspace,
} from "./notification.service.js";
import { notifyConversationAssignee } from "./automation.service.js";

const DEFAULT_INTERVAL_MS = 60 * 1000;
let workflowTimer = null;
let isProcessing = false;

const claimTask = async (taskId) =>
  WorkflowTask.findOneAndUpdate(
    { _id: taskId, status: "pending" },
    { $set: { status: "processing" }, $inc: { attempts: 1 } },
    { new: true },
  );

const markTaskCompleted = async (taskId) =>
  WorkflowTask.findByIdAndUpdate(taskId, {
    status: "completed",
    processedAt: new Date(),
    lastError: "",
  });

const markTaskFailed = async (task) => {
  const attempts = Number(task?.attempts || 0);
  const maxAttempts = Number(task?.maxAttempts || 3);
  const permanentFailure = attempts >= maxAttempts;

  if (permanentFailure) {
    await WorkflowTask.findByIdAndUpdate(task._id, {
      status: "failed",
      processedAt: new Date(),
      lastError: String(task.lastError || "Task failed").slice(0, 500),
    });
    return;
  }

  const retryAt = new Date();
  retryAt.setMinutes(retryAt.getMinutes() + 5);
  await WorkflowTask.findByIdAndUpdate(task._id, {
    status: "pending",
    dueAt: retryAt,
  });
};

const processSlaReminder = async (task) => {
  const conversation = await Conversation.findOne({
    _id: task.conversationId,
    workspaceId: task.workspaceId,
  });
  if (!conversation) return;

  await notifyConversationAssignee({
    conversation,
    title: "SLA reminder",
    message: "A conversation SLA due time is approaching.",
    metadata: {
      conversationId: String(conversation._id),
      workflowTaskId: String(task._id),
    },
  });
};

const processEscalationCheck = async (task) => {
  const conversation = await Conversation.findOne({
    _id: task.conversationId,
    workspaceId: task.workspaceId,
  });
  if (!conversation) return;
  if (conversation.status === "resolved" || conversation.status === "escalated") {
    return;
  }

  conversation.status = "escalated";
  conversation.metadata = {
    ...(conversation.metadata || {}),
    escalatedAt: new Date().toISOString(),
    escalationSource: "workflow",
  };

  if (!conversation.assignedTo && !conversation.assignedAgent) {
    const fallbackAgent = await pickRoundRobinAgent({
      workspaceId: String(task.workspaceId || ""),
      department: String(conversation.department || ""),
    });
    if (fallbackAgent?._id) {
      conversation.assignedTo = fallbackAgent._id;
      conversation.assignedAgent = fallbackAgent._id;
    }
  }

  await conversation.save();

  await notifyUsersByRoles({
    workspaceId: String(task.workspaceId || ""),
    roles: ["owner", "admin"],
    title: "Conversation escalated",
    message: `Conversation ${String(conversation._id)} was escalated by workflow automation.`,
    metadata: {
      conversationId: String(conversation._id),
      workflowTaskId: String(task._id),
    },
  });

  await dispatchIntegrationEvent({
    workspaceId: String(task.workspaceId || ""),
    event: "conversation_escalated",
    payload: {
      conversationId: String(conversation._id),
      status: conversation.status,
      department: String(conversation.department || ""),
    },
  });
};

const processNotificationReminder = async (task) => {
  const conversation = await Conversation.findOne({
    _id: task.conversationId,
    workspaceId: task.workspaceId,
  });
  if (!conversation) return;

  await notifyConversationAssignee({
    conversation,
    title: "Conversation reminder",
    message:
      String(task?.payload?.message || "").trim() ||
      "You have an unattended conversation reminder.",
    metadata: {
      conversationId: String(conversation._id),
      workflowTaskId: String(task._id),
    },
  });
};

const processPostResolutionFollowup = async (task) => {
  const conversation = await Conversation.findOne({
    _id: task.conversationId,
    workspaceId: task.workspaceId,
  });
  if (!conversation) return;
  if (conversation.status !== "resolved") return;

  const alreadySentAt = String(
    conversation?.metadata?.postResolutionFollowUpSentAt || "",
  ).trim();
  if (alreadySentAt) return;

  const receiverId = conversation.visitorUserId || null;
  if (!receiverId) return;

  const content =
    String(task?.payload?.message || "").trim() ||
    "Thanks for contacting us. If anything else comes up, reply here and we will help.";

  await Message.create({
    conversationId: conversation._id,
    workspaceId: conversation.workspaceId || task.workspaceId,
    senderType: "ai",
    senderId: conversation.assignedTo || conversation.assignedAgent || undefined,
    receiverId,
    content,
  });

  conversation.metadata = {
    ...(conversation.metadata || {}),
    postResolutionFollowUpSentAt: new Date().toISOString(),
  };
  conversation.lastMessageAt = new Date();
  await conversation.save();

  await dispatchIntegrationEvent({
    workspaceId: String(task.workspaceId || ""),
    event: "post_resolution_followup",
    payload: {
      conversationId: String(conversation._id),
      message: content,
    },
  });
};

const processDailyDigest = async (task) => {
  await sendDailyDigestForWorkspace({
    workspaceId: String(task.workspaceId || ""),
  });
};

const processSingleTask = async (task) => {
  const taskType = String(task?.taskType || "").trim().toLowerCase();

  if (taskType === "sla-reminder") {
    await processSlaReminder(task);
    return;
  }
  if (taskType === "escalation-check") {
    await processEscalationCheck(task);
    return;
  }
  if (taskType === "notification-reminder") {
    await processNotificationReminder(task);
    return;
  }
  if (taskType === "post-resolution-followup") {
    await processPostResolutionFollowup(task);
    return;
  }
  if (taskType === "daily-digest") {
    await processDailyDigest(task);
  }
};

export const processDueWorkflowTasks = async ({ limit = 20 } = {}) => {
  if (isProcessing) return { processed: 0, skipped: true };
  isProcessing = true;

  try {
    const dueTasks = await WorkflowTask.find({
      status: "pending",
      dueAt: { $lte: new Date() },
    })
      .sort({ dueAt: 1 })
      .limit(Math.max(1, Math.min(Number(limit) || 20, 100)))
      .select("_id")
      .lean();

    let processed = 0;
    for (const pending of dueTasks) {
      const task = await claimTask(pending._id);
      if (!task) continue;

      try {
        await processSingleTask(task);
        await markTaskCompleted(task._id);
        processed += 1;
      } catch (error) {
        task.lastError = String(error?.message || "Workflow task failed");
        await markTaskFailed(task);
      }
    }

    return { processed, skipped: false };
  } finally {
    isProcessing = false;
  }
};

export const startWorkflowScheduler = ({ intervalMs = DEFAULT_INTERVAL_MS } = {}) => {
  if (workflowTimer) return;

  workflowTimer = setInterval(() => {
    processDueWorkflowTasks().catch(() => {});
  }, Math.max(10000, Number(intervalMs) || DEFAULT_INTERVAL_MS));
};

export const stopWorkflowScheduler = () => {
  if (!workflowTimer) return;
  clearInterval(workflowTimer);
  workflowTimer = null;
};
