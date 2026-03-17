import { AutomationRule } from "../models/automationRule.model.js";
import { WorkflowTask } from "../models/workflowTask.model.js";
import { User } from "../models/user.model.js";
import { Conversation } from "../models/conversation.model.js";
import { pickRoundRobinAgent } from "./routing.service.js";
import {
  createInAppNotification,
  notifyUsersByRoles,
} from "./notification.service.js";

const normalizeText = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const normalizeStringList = (items = []) =>
  Array.from(
    new Set(
      (Array.isArray(items) ? items : [])
        .map((item) => normalizeText(item))
        .filter(Boolean),
    ),
  );

const normalizeTagList = (tags = []) =>
  Array.from(
    new Set(
      (Array.isArray(tags) ? tags : [])
        .map((tag) => normalizeText(tag))
        .filter(Boolean),
    ),
  );

const toPositiveMinutes = (value) => {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? Math.round(num) : 0;
};

const withMinutes = (baseDate, minutes) => {
  const next = new Date(baseDate);
  next.setMinutes(next.getMinutes() + minutes);
  return next;
};

const resolveConversationPriority = (conversation) =>
  normalizeText(
    conversation?.metadata?.priority || conversation?.metadata?.priorityLevel,
  );

const matchMessageContainsAny = (message, expected = []) => {
  const patterns = normalizeStringList(expected);
  if (patterns.length === 0) return true;
  const content = normalizeText(message?.content || "");
  if (!content) return false;
  return patterns.some((pattern) => content.includes(pattern));
};

const matchesRuleConditions = (rule, { conversation, message, senderType }) => {
  const conditions = rule?.conditions || {};

  const statusIn = normalizeStringList(conditions.statusIn);
  if (statusIn.length > 0) {
    const conversationStatus = normalizeText(conversation?.status);
    if (!statusIn.includes(conversationStatus)) return false;
  }

  const departmentIn = normalizeStringList(conditions.departmentIn);
  if (departmentIn.length > 0) {
    const conversationDepartment = normalizeText(
      conversation?.department || conversation?.metadata?.department,
    );
    if (!departmentIn.includes(conversationDepartment)) return false;
  }

  const tagsAny = normalizeTagList(conditions.tagsAny);
  if (tagsAny.length > 0) {
    const conversationTags = new Set(normalizeTagList(conversation?.tags));
    const hasTag = tagsAny.some((tag) => conversationTags.has(tag));
    if (!hasTag) return false;
  }

  const senderTypeIn = normalizeStringList(conditions.senderTypeIn);
  if (senderTypeIn.length > 0) {
    const resolvedSenderType =
      normalizeText(senderType) || normalizeText(message?.senderType);
    if (!senderTypeIn.includes(resolvedSenderType)) return false;
  }

  const priorityIn = normalizeStringList(conditions.priorityIn);
  if (priorityIn.length > 0) {
    const priority = resolveConversationPriority(conversation);
    if (!priorityIn.includes(priority)) return false;
  }

  if (!matchMessageContainsAny(message, conditions.containsAny)) return false;

  return true;
};

const ensureConversationDocument = async (conversation) => {
  if (!conversation) return null;
  if (typeof conversation.save === "function") return conversation;
  const conversationId = String(conversation?._id || "").trim();
  if (!conversationId) return null;
  return Conversation.findById(conversationId);
};

const queueWorkflowTask = async ({
  workspaceId,
  conversationId,
  taskType,
  dueAt,
  payload = {},
}) => {
  if (!workspaceId || !taskType || !dueAt) return null;

  return WorkflowTask.create({
    workspaceId,
    conversationId: conversationId || undefined,
    taskType,
    dueAt,
    payload: payload && typeof payload === "object" ? payload : {},
    status: "pending",
  });
};

const assignConversationByMode = async ({
  actions,
  conversation,
  workspaceId,
  department,
}) => {
  const assignMode = normalizeText(actions?.assignMode || "none");
  if (assignMode === "none" || !conversation) return false;

  let assignedUser = null;

  if (assignMode === "specific-agent" && actions?.assignUserId) {
    assignedUser = await User.findOne({
      _id: actions.assignUserId,
      workspaceId,
      role: { $in: ["owner", "admin", "agent"] },
      status: { $ne: "busy" },
    })
      .select("_id")
      .lean();
  } else if (assignMode === "round-robin") {
    assignedUser = await pickRoundRobinAgent({ workspaceId, department: "" });
  } else if (assignMode === "department-round-robin") {
    assignedUser = await pickRoundRobinAgent({
      workspaceId,
      department: department || conversation?.department || "",
    });
  }

  const assignedUserId = String(assignedUser?._id || "").trim();
  if (!assignedUserId) return false;

  const currentAssigned = String(
    conversation.assignedTo || conversation.assignedAgent || "",
  ).trim();
  if (currentAssigned === assignedUserId) return false;

  conversation.assignedTo = assignedUserId;
  conversation.assignedAgent = assignedUserId;
  return true;
};

const applyRuleActions = async ({
  rule,
  workspaceId,
  conversation,
  message,
  actorId,
}) => {
  const actions = rule?.actions || {};
  let changed = false;

  if (conversation) {
    const addTags = normalizeTagList(actions.addTags);
    const removeTags = new Set(normalizeTagList(actions.removeTags));
    const currentTags = normalizeTagList(conversation.tags);
    const mergedTags = normalizeTagList([
      ...currentTags.filter((tag) => !removeTags.has(tag)),
      ...addTags,
    ]);
    if (mergedTags.join(",") !== currentTags.join(",")) {
      conversation.tags = mergedTags;
      changed = true;
    }

    const setDepartment = normalizeText(actions.setDepartment);
    if (setDepartment && normalizeText(conversation.department) !== setDepartment) {
      conversation.department = setDepartment;
      changed = true;
    }

    const setPriority = normalizeText(actions.setPriority);
    if (setPriority) {
      const currentPriority = resolveConversationPriority(conversation);
      if (currentPriority !== setPriority) {
        conversation.metadata = {
          ...(conversation.metadata || {}),
          priority: setPriority,
        };
        changed = true;
      }
    }

    const assignedChanged = await assignConversationByMode({
      actions,
      conversation,
      workspaceId,
      department: conversation.department,
    });
    if (assignedChanged) changed = true;

    const slaMinutes = toPositiveMinutes(actions.setSlaMinutes);
    if (slaMinutes > 0) {
      const slaDueAt = withMinutes(new Date(), slaMinutes);
      conversation.metadata = {
        ...(conversation.metadata || {}),
        slaMinutes,
        slaDueAt: slaDueAt.toISOString(),
      };
      changed = true;

      const reminderMinutesBefore = toPositiveMinutes(
        actions.createReminderMinutesBefore,
      );
      if (reminderMinutesBefore > 0 && reminderMinutesBefore < slaMinutes) {
        await queueWorkflowTask({
          workspaceId,
          conversationId: conversation._id,
          taskType: "sla-reminder",
          dueAt: withMinutes(slaDueAt, -1 * reminderMinutesBefore),
          payload: {
            ruleId: String(rule._id),
            reminderMinutesBefore,
            triggeredByMessageId: String(message?._id || ""),
          },
        });
      }
    }

    const escalationAfterMinutes = toPositiveMinutes(actions.escalateAfterMinutes);
    if (escalationAfterMinutes > 0) {
      await queueWorkflowTask({
        workspaceId,
        conversationId: conversation._id,
        taskType: "escalation-check",
        dueAt: withMinutes(new Date(), escalationAfterMinutes),
        payload: {
          ruleId: String(rule._id),
          escalationAfterMinutes,
          trigger: rule.trigger,
        },
      });
    }

    const followUpDelayMinutes = toPositiveMinutes(actions.followUpDelayMinutes);
    const followUpMessage = String(actions.followUpMessage || "").trim();
    if (
      followUpDelayMinutes > 0 &&
      followUpMessage &&
      String(conversation.status || "") === "resolved"
    ) {
      await queueWorkflowTask({
        workspaceId,
        conversationId: conversation._id,
        taskType: "post-resolution-followup",
        dueAt: withMinutes(new Date(), followUpDelayMinutes),
        payload: {
          ruleId: String(rule._id),
          message: followUpMessage,
          createdBy: String(actorId || ""),
        },
      });
    }
  }

  const notifyRoles = normalizeStringList(actions.notifyRoles);
  if (notifyRoles.length > 0) {
    const conversationId = String(conversation?._id || "").trim();
    await notifyUsersByRoles({
      workspaceId,
      roles: notifyRoles,
      title: `Automation: ${rule.name}`,
      message: conversationId
        ? `Rule "${rule.name}" applied to conversation ${conversationId}.`
        : `Rule "${rule.name}" triggered.`,
      metadata: {
        automationRuleId: String(rule._id),
        conversationId,
      },
    });
  }

  return { changed };
};

export const executeAutomationRules = async ({
  workspaceId,
  trigger,
  conversation = null,
  message = null,
  senderType = "",
  actorId = "",
  dryRun = false,
} = {}) => {
  const normalizedTrigger = normalizeText(trigger);
  const normalizedWorkspaceId = String(
    workspaceId || conversation?.workspaceId || message?.workspaceId || "",
  ).trim();

  if (!normalizedWorkspaceId || !normalizedTrigger) {
    return { matchedRules: [], changed: false };
  }

  const rules = await AutomationRule.find({
    workspaceId: normalizedWorkspaceId,
    trigger: normalizedTrigger,
    enabled: true,
  })
    .sort({ priority: 1, createdAt: 1 })
    .lean();

  if (rules.length === 0) return { matchedRules: [], changed: false };

  const conversationDoc = await ensureConversationDocument(conversation);
  const matchedRules = [];
  let changed = false;

  for (const rule of rules) {
    const isMatch = matchesRuleConditions(rule, {
      conversation: conversationDoc,
      message,
      senderType,
    });
    if (!isMatch) continue;

    matchedRules.push({
      id: String(rule._id),
      name: String(rule.name || ""),
      trigger: String(rule.trigger || ""),
    });

    if (dryRun) continue;

    const actionResult = await applyRuleActions({
      rule,
      workspaceId: normalizedWorkspaceId,
      conversation: conversationDoc,
      message,
      actorId,
    });

    if (actionResult.changed) changed = true;
  }

  if (!dryRun && conversationDoc && changed) {
    await conversationDoc.save();
  }

  return { matchedRules, changed };
};

export const createManualWorkflowTask = async ({
  workspaceId,
  conversationId = "",
  taskType,
  minutesFromNow = 5,
  payload = {},
}) => {
  const safeMinutes = toPositiveMinutes(minutesFromNow) || 5;
  return queueWorkflowTask({
    workspaceId,
    conversationId,
    taskType,
    dueAt: withMinutes(new Date(), safeMinutes),
    payload,
  });
};

export const notifyConversationAssignee = async ({
  conversation,
  title,
  message,
  metadata = {},
}) => {
  const assigneeId = String(
    conversation?.assignedTo || conversation?.assignedAgent || "",
  ).trim();
  const workspaceId = String(conversation?.workspaceId || "").trim();
  if (!assigneeId || !workspaceId || !String(message || "").trim()) return null;

  return createInAppNotification({
    workspaceId,
    userId: assigneeId,
    title,
    message,
    metadata,
  });
};
