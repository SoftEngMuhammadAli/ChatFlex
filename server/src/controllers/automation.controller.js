import { AutomationRule } from "../models/automationRule.model.js";
import { CannedResponse } from "../models/cannedResponse.model.js";
import { Conversation } from "../models/conversation.model.js";
import { WorkflowTask } from "../models/workflowTask.model.js";
import { catchAsyncHandler } from "../middleware/error.middleware.js";
import {
  createManualWorkflowTask,
  executeAutomationRules,
} from "../services/automation.service.js";
import { processDueWorkflowTasks } from "../services/workflow.service.js";
import { getRoundRobinSnapshot } from "../services/routing.service.js";

const normalizeText = (value) => String(value || "").trim();

const resolveWorkspaceContext = (req) => {
  const isSuperAdmin = String(req.user?.role || "") === "super-admin";
  const requestedWorkspaceId = normalizeText(
    req.query?.workspaceId || req.body?.workspaceId,
  );
  const workspaceId = isSuperAdmin
    ? requestedWorkspaceId || normalizeText(req.user?.workspaceId)
    : normalizeText(req.user?.workspaceId);

  return { isSuperAdmin, workspaceId };
};

const ensureWorkspaceAccess = (req, res) => {
  const ctx = resolveWorkspaceContext(req);
  if (!ctx.workspaceId) {
    res.status(400).json({ message: "Workspace is required for this action" });
    return null;
  }
  return ctx;
};

const normalizeRulePayload = (body = {}) => {
  const allowedTriggers = new Set([
    "conversation_created",
    "visitor_message",
    "agent_message",
    "conversation_resolved",
    "sla_due",
    "manual",
  ]);

  const trigger = normalizeText(body.trigger).toLowerCase();
  const safeTrigger = allowedTriggers.has(trigger) ? trigger : "manual";

  return {
    name: normalizeText(body.name),
    description: normalizeText(body.description),
    trigger: safeTrigger,
    enabled: body.enabled !== false,
    priority: Number.isFinite(Number(body.priority))
      ? Math.max(1, Math.min(1000, Number(body.priority)))
      : 100,
    conditions:
      body.conditions && typeof body.conditions === "object" ? body.conditions : {},
    actions: body.actions && typeof body.actions === "object" ? body.actions : {},
  };
};

const normalizeCannedResponsePayload = (body = {}) => ({
  title: normalizeText(body.title),
  body: normalizeText(body.body),
  category: normalizeText(body.category) || "General",
  shortcut: normalizeText(body.shortcut),
  tags: Array.isArray(body.tags)
    ? body.tags
        .map((tag) => normalizeText(tag).toLowerCase())
        .filter(Boolean)
        .slice(0, 20)
    : [],
  enabled: body.enabled !== false,
});

export const getAutomationRules = catchAsyncHandler(async (req, res) => {
  const ctx = ensureWorkspaceAccess(req, res);
  if (!ctx) return;

  const query = { workspaceId: ctx.workspaceId };
  if (typeof req.query.enabled !== "undefined") {
    query.enabled = String(req.query.enabled).toLowerCase() !== "false";
  }
  if (normalizeText(req.query.trigger)) {
    query.trigger = normalizeText(req.query.trigger).toLowerCase();
  }

  const rules = await AutomationRule.find(query)
    .sort({ priority: 1, createdAt: -1 })
    .lean();

  const routingPreview = await getRoundRobinSnapshot({
    workspaceId: ctx.workspaceId,
    department: normalizeText(req.query.department),
  });

  return res.status(200).json({
    data: rules,
    meta: {
      routingPreview,
    },
  });
});

export const createAutomationRule = catchAsyncHandler(async (req, res) => {
  const ctx = ensureWorkspaceAccess(req, res);
  if (!ctx) return;

  const payload = normalizeRulePayload(req.body);
  if (!payload.name) {
    return res.status(400).json({ message: "Rule name is required" });
  }

  const rule = await AutomationRule.create({
    workspaceId: ctx.workspaceId,
    ...payload,
    createdBy: req.user?._id || undefined,
    updatedBy: req.user?._id || undefined,
  });

  return res.status(201).json({ data: rule });
});

export const updateAutomationRule = catchAsyncHandler(async (req, res) => {
  const ctx = ensureWorkspaceAccess(req, res);
  if (!ctx) return;

  const updates = { updatedBy: req.user?._id || undefined };
  if (Object.prototype.hasOwnProperty.call(req.body, "name")) {
    updates.name = normalizeText(req.body.name);
  }
  if (Object.prototype.hasOwnProperty.call(req.body, "description")) {
    updates.description = normalizeText(req.body.description);
  }
  if (Object.prototype.hasOwnProperty.call(req.body, "trigger")) {
    updates.trigger = normalizeRulePayload({ trigger: req.body.trigger }).trigger;
  }
  if (Object.prototype.hasOwnProperty.call(req.body, "enabled")) {
    updates.enabled = req.body.enabled !== false;
  }
  if (Object.prototype.hasOwnProperty.call(req.body, "priority")) {
    updates.priority = Number.isFinite(Number(req.body.priority))
      ? Math.max(1, Math.min(1000, Number(req.body.priority)))
      : 100;
  }
  if (
    Object.prototype.hasOwnProperty.call(req.body, "conditions") &&
    req.body.conditions &&
    typeof req.body.conditions === "object"
  ) {
    updates.conditions = req.body.conditions;
  }
  if (
    Object.prototype.hasOwnProperty.call(req.body, "actions") &&
    req.body.actions &&
    typeof req.body.actions === "object"
  ) {
    updates.actions = req.body.actions;
  }

  const rule = await AutomationRule.findOneAndUpdate(
    {
      _id: req.params.id,
      workspaceId: ctx.workspaceId,
    },
    updates,
    { new: true, runValidators: true },
  );

  if (!rule) {
    return res.status(404).json({ message: "Automation rule not found" });
  }

  return res.status(200).json({ data: rule });
});

export const deleteAutomationRule = catchAsyncHandler(async (req, res) => {
  const ctx = ensureWorkspaceAccess(req, res);
  if (!ctx) return;

  const deleted = await AutomationRule.findOneAndDelete({
    _id: req.params.id,
    workspaceId: ctx.workspaceId,
  });
  if (!deleted) {
    return res.status(404).json({ message: "Automation rule not found" });
  }

  return res.status(200).json({ message: "Automation rule deleted" });
});

export const testAutomationRules = catchAsyncHandler(async (req, res) => {
  const ctx = ensureWorkspaceAccess(req, res);
  if (!ctx) return;

  const conversationId = normalizeText(req.body?.conversationId);
  const trigger = normalizeText(req.body?.trigger || "manual").toLowerCase();
  const senderType = normalizeText(req.body?.senderType).toLowerCase();

  const conversation = conversationId
    ? await Conversation.findOne({
        _id: conversationId,
        workspaceId: ctx.workspaceId,
      })
    : null;

  const message = req.body?.message && typeof req.body.message === "object"
    ? req.body.message
    : {};

  const result = await executeAutomationRules({
    workspaceId: ctx.workspaceId,
    trigger,
    conversation,
    message,
    senderType,
    dryRun: true,
  });

  return res.status(200).json({
    data: result,
  });
});

export const getCannedResponses = catchAsyncHandler(async (req, res) => {
  const ctx = ensureWorkspaceAccess(req, res);
  if (!ctx) return;

  const q = normalizeText(req.query.q || req.query.query).toLowerCase();
  const category = normalizeText(req.query.category);
  const tag = normalizeText(req.query.tag).toLowerCase();

  const query = { workspaceId: ctx.workspaceId };
  if (typeof req.query.enabled !== "undefined") {
    query.enabled = String(req.query.enabled).toLowerCase() !== "false";
  }
  if (category) {
    query.category = category;
  }
  if (tag) {
    query.tags = tag;
  }
  if (q) {
    query.$or = [
      { title: { $regex: q, $options: "i" } },
      { body: { $regex: q, $options: "i" } },
      { shortcut: { $regex: q, $options: "i" } },
    ];
  }

  const responses = await CannedResponse.find(query)
    .sort({ updatedAt: -1 })
    .lean();

  return res.status(200).json({ data: responses });
});

export const createCannedResponse = catchAsyncHandler(async (req, res) => {
  const ctx = ensureWorkspaceAccess(req, res);
  if (!ctx) return;

  const payload = normalizeCannedResponsePayload(req.body);
  if (!payload.title || !payload.body) {
    return res
      .status(400)
      .json({ message: "Canned response title and body are required" });
  }

  const response = await CannedResponse.create({
    workspaceId: ctx.workspaceId,
    ...payload,
    createdBy: req.user?._id || undefined,
    updatedBy: req.user?._id || undefined,
  });

  return res.status(201).json({ data: response });
});

export const updateCannedResponse = catchAsyncHandler(async (req, res) => {
  const ctx = ensureWorkspaceAccess(req, res);
  if (!ctx) return;

  const updates = { updatedBy: req.user?._id || undefined };
  if (Object.prototype.hasOwnProperty.call(req.body, "title")) {
    updates.title = normalizeText(req.body.title);
  }
  if (Object.prototype.hasOwnProperty.call(req.body, "body")) {
    updates.body = normalizeText(req.body.body);
  }
  if (Object.prototype.hasOwnProperty.call(req.body, "category")) {
    updates.category = normalizeText(req.body.category) || "General";
  }
  if (Object.prototype.hasOwnProperty.call(req.body, "shortcut")) {
    updates.shortcut = normalizeText(req.body.shortcut);
  }
  if (Object.prototype.hasOwnProperty.call(req.body, "tags")) {
    updates.tags = Array.isArray(req.body.tags)
      ? req.body.tags
          .map((tag) => normalizeText(tag).toLowerCase())
          .filter(Boolean)
          .slice(0, 20)
      : [];
  }
  if (Object.prototype.hasOwnProperty.call(req.body, "enabled")) {
    updates.enabled = req.body.enabled !== false;
  }

  const response = await CannedResponse.findOneAndUpdate(
    { _id: req.params.id, workspaceId: ctx.workspaceId },
    updates,
    { new: true, runValidators: true },
  );

  if (!response) {
    return res.status(404).json({ message: "Canned response not found" });
  }

  return res.status(200).json({ data: response });
});

export const deleteCannedResponse = catchAsyncHandler(async (req, res) => {
  const ctx = ensureWorkspaceAccess(req, res);
  if (!ctx) return;

  const deleted = await CannedResponse.findOneAndDelete({
    _id: req.params.id,
    workspaceId: ctx.workspaceId,
  });
  if (!deleted) {
    return res.status(404).json({ message: "Canned response not found" });
  }

  return res.status(200).json({ message: "Canned response deleted" });
});

export const getWorkflowTasks = catchAsyncHandler(async (req, res) => {
  const ctx = ensureWorkspaceAccess(req, res);
  if (!ctx) return;

  const query = { workspaceId: ctx.workspaceId };
  if (normalizeText(req.query.status)) {
    query.status = normalizeText(req.query.status).toLowerCase();
  }
  if (normalizeText(req.query.taskType)) {
    query.taskType = normalizeText(req.query.taskType).toLowerCase();
  }

  const tasks = await WorkflowTask.find(query)
    .sort({ dueAt: 1, createdAt: -1 })
    .limit(Math.max(1, Math.min(Number(req.query.limit) || 100, 500)))
    .lean();

  return res.status(200).json({ data: tasks });
});

export const createWorkflowTask = catchAsyncHandler(async (req, res) => {
  const ctx = ensureWorkspaceAccess(req, res);
  if (!ctx) return;

  const taskType = normalizeText(req.body.taskType).toLowerCase();
  if (!taskType) {
    return res.status(400).json({ message: "taskType is required" });
  }

  const conversationId = normalizeText(req.body.conversationId);
  const task = await createManualWorkflowTask({
    workspaceId: ctx.workspaceId,
    conversationId,
    taskType,
    minutesFromNow: Number(req.body.minutesFromNow || 5),
    payload: req.body.payload && typeof req.body.payload === "object"
      ? req.body.payload
      : {},
  });

  return res.status(201).json({ data: task });
});

export const processWorkflowTasksNow = catchAsyncHandler(async (_req, res) => {
  const result = await processDueWorkflowTasks({ limit: 50 });
  return res.status(200).json({ data: result });
});
