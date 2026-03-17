import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { Usage } from "../models/usage.model.js";
import { User } from "../models/user.model.js";
import { Workspace } from "../models/workspace.model.js";
import { WidgetTemplate } from "../models/widgetTemplate.model.js";
import { getOnlineUserIdsForWorkspace } from "../utils/onlineUsers.js";
import { pickRoundRobinAgent } from "../services/routing.service.js";

export const normalizeId = (value) => (value ? String(value) : "");
const WIDGET_VISITOR_PASSWORD_HASH = bcrypt.hashSync("widget-visitor", 10);
const SOCKET_TOKEN_SECRET =
  process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || "";

export const getDefaultWorkspace = async () =>
  Workspace.findOne({}).sort({ createdAt: 1 });

export const getWorkspaceByApiKey = async (apiKey) => {
  if (!apiKey || typeof apiKey !== "string") return null;
  return Workspace.findOne({ apiKey: String(apiKey).trim() });
};

const isDomainAllowed = (workspace, originHost) => {
  const domains = Array.isArray(workspace?.allowedDomains)
    ? workspace.allowedDomains.filter(Boolean)
    : [];
  if (domains.length === 0) return true;

  const normalizedHost = String(originHost || "")
    .trim()
    .toLowerCase();
  if (!normalizedHost) return false;

  // Local development convenience: allow localhost origins even when a
  // production allowlist exists.
  if (
    process.env.NODE_ENV !== "production" &&
    (normalizedHost === "localhost" || normalizedHost === "127.0.0.1")
  ) {
    return true;
  }

  return domains.some((domain) => {
    const normalizedDomain = String(domain || "")
      .trim()
      .toLowerCase();
    if (!normalizedDomain) return false;
    return (
      normalizedHost === normalizedDomain ||
      normalizedHost.endsWith(`.${normalizedDomain}`)
    );
  });
};

const validateWidgetApiKey = async (apiKey) => {
  const workspace = await getWorkspaceByApiKey(apiKey);
  if (!workspace) return null;
  return workspace;
};

const validateWidgetTemplateCredentials = async ({
  widgetId,
  widgetToken,
  visitorEmail,
  enforceVisitorIdentity = true,
}) => {
  const hasWidgetId = Boolean(widgetId);
  const hasWidgetToken = Boolean(widgetToken);
  if (!hasWidgetId && !hasWidgetToken) return null;
  if (!hasWidgetId || !hasWidgetToken) {
    return { denied: true, reason: "Invalid widget credentials" };
  }

  const template =
    await WidgetTemplate.findById(widgetId).select("+accessToken");
  if (!template) {
    return { denied: true, reason: "Invalid widget credentials" };
  }
  if (!template.accessToken) {
    template.accessToken = crypto.randomBytes(24).toString("hex");
    await template.save();
  }
  if (String(template.accessToken || "") !== String(widgetToken)) {
    return { denied: true, reason: "Invalid widget credentials" };
  }

  const allowedEmail = String(template.allowedUserEmail || "")
    .trim()
    .toLowerCase();
  if (allowedEmail && enforceVisitorIdentity) {
    const normalizedVisitorEmail = String(visitorEmail || "")
      .trim()
      .toLowerCase();
    if (!normalizedVisitorEmail) {
      return {
        denied: true,
        reason: "Email is required for this widget",
      };
    }
    if (normalizedVisitorEmail !== allowedEmail) {
      return {
        denied: true,
        reason: "This widget is restricted to a specific user",
      };
    }
  }

  return { template };
};

export const validateWidgetAccess = async ({
  apiKey,
  widgetId,
  widgetToken,
  visitorEmail,
  originHost,
  enforceVisitorIdentity = true,
}) => {
  const widgetTemplateResult = await validateWidgetTemplateCredentials({
    widgetId,
    widgetToken,
    visitorEmail,
    enforceVisitorIdentity,
  });

  if (widgetTemplateResult?.denied) return widgetTemplateResult;
  if (widgetTemplateResult?.template) {
    return { mode: "template", template: widgetTemplateResult.template };
  }

  const workspace = await validateWidgetApiKey(apiKey);
  if (!workspace) return null;

  if (!isDomainAllowed(workspace, originHost)) {
    return {
      denied: true,
      reason: "Widget access is not allowed for this domain",
    };
  }

  return { mode: "apiKey", workspace };
};

export const getWidgetVisitorEmail = ({ visitorId, workspaceId }) => {
  const normalizedVisitorId = String(visitorId || "").trim();
  const normalizedWorkspaceId = String(workspaceId || "").trim().toLowerCase();
  if (normalizedWorkspaceId) {
    return `visitor+${normalizedWorkspaceId}.${normalizedVisitorId}@widget.chatflex.local`;
  }
  return `visitor+${normalizedVisitorId}@widget.chatflex.local`;
};

export const findWidgetVisitorUser = async ({ visitorId, workspaceId }) => {
  const normalizedVisitorId = String(visitorId || "").trim();
  if (!normalizedVisitorId) return null;

  const workspaceScope = workspaceId ? { workspaceId } : {};
  const byVisitorId = await User.findOne({
    widgetVisitorId: normalizedVisitorId,
    ...workspaceScope,
  });
  if (byVisitorId) return byVisitorId;

  const legacyEmail = getWidgetVisitorEmail({ visitorId, workspaceId });
  return User.findOne({
    email: legacyEmail,
    ...workspaceScope,
  });
};

export const parseAfterDate = (value) => {
  if (!value) return null;
  const afterDate = new Date(value);
  return Number.isNaN(afterDate.getTime()) ? null : afterDate;
};

export const sanitizeAttachments = (attachments) => {
  if (!Array.isArray(attachments)) return [];
  return attachments
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const url = String(item.url || "").trim();
      if (!url) return null;
      const name = String(item.name || "").trim();
      const type = String(item.type || "").trim();
      const size = Number(item.size);
      return {
        url,
        ...(type ? { type } : {}),
        ...(name ? { name } : {}),
        ...(Number.isFinite(size) && size > 0 ? { size } : {}),
      };
    })
    .filter(Boolean);
};

export const sanitizeFaq = (faq) => ({
  _id: normalizeId(faq._id),
  question: String(faq.question || "").trim(),
  answer: String(faq.answer || "").trim(),
  category: String(faq.category || "").trim(),
  status: String(faq.status || "published").toLowerCase(),
});

export const getOrCreateWidgetVisitorUser = async ({
  visitorId,
  metadata,
  workspaceId,
}) => {
  const normalizedVisitorId = String(visitorId || "").trim();
  const normalizedProfileEmail = String(metadata?.email || "")
    .trim()
    .toLowerCase();
  const legacySyntheticEmail = getWidgetVisitorEmail({ visitorId, workspaceId });
  const existingUser = await findWidgetVisitorUser({
    visitorId: normalizedVisitorId,
    workspaceId,
  });
  if (existingUser) {
    let shouldSave = false;
    if (!existingUser.workspaceId && workspaceId) {
      existingUser.workspaceId = workspaceId;
      shouldSave = true;
    }
    if (!existingUser.widgetVisitorId && normalizedVisitorId) {
      existingUser.widgetVisitorId = normalizedVisitorId;
      shouldSave = true;
    }
    if (metadata?.name && String(metadata.name || "").trim()) {
      existingUser.name = String(metadata.name).trim();
      shouldSave = true;
    }
    if (normalizedProfileEmail) {
      existingUser.widgetVisitorEmail = normalizedProfileEmail;
      shouldSave = true;

      const canAdoptAsPrimaryEmail = !await User.exists({
        _id: { $ne: existingUser._id },
        email: normalizedProfileEmail,
      });
      if (canAdoptAsPrimaryEmail && existingUser.email !== normalizedProfileEmail) {
        existingUser.email = normalizedProfileEmail;
        shouldSave = true;
      } else if (!existingUser.email) {
        existingUser.email = legacySyntheticEmail;
        shouldSave = true;
      }
    } else if (!existingUser.email) {
      existingUser.email = legacySyntheticEmail;
      shouldSave = true;
    }

    if (shouldSave) {
      await existingUser.save();
    }
    return existingUser;
  }

  const fallbackName = `Visitor ${normalizedVisitorId.slice(-6).toUpperCase()}`;
  let primaryEmail = legacySyntheticEmail;
  if (normalizedProfileEmail) {
    const emailTaken = await User.exists({ email: normalizedProfileEmail });
    if (!emailTaken) {
      primaryEmail = normalizedProfileEmail;
    }
  }

  return User.create({
    name: metadata?.name || fallbackName,
    email: primaryEmail,
    widgetVisitorId: normalizedVisitorId,
    widgetVisitorEmail: normalizedProfileEmail || "",
    passwordHash: WIDGET_VISITOR_PASSWORD_HASH,
    role: "viewer",
    status: "online",
    ...(workspaceId ? { workspaceId } : {}),
  });
};

export const createWidgetSocketToken = (user) => {
  if (!SOCKET_TOKEN_SECRET || !user?._id) return "";
  return jwt.sign(
    {
      id: user._id,
      role: user.role || "viewer",
      source: "widget",
    },
    SOCKET_TOKEN_SECRET,
    { expiresIn: "24h" },
  );
};

const buildDepartmentQuery = (department = "") => {
  const normalizedDepartment = String(department || "")
    .trim()
    .toLowerCase();
  if (!normalizedDepartment) return {};
  return {
    $or: [
      { departments: normalizedDepartment },
      { departments: normalizedDepartment.toUpperCase() },
      { departments: normalizedDepartment.replace(/\b\w/g, (c) => c.toUpperCase()) },
    ],
  };
};

export const pickDefaultAgent = async ({ workspaceId, department } = {}) => {
  if (!workspaceId) return null;

  const rrAgent = await pickRoundRobinAgent({
    workspaceId,
    department,
    preferOnline: true,
  });
  if (rrAgent) return rrAgent;

  const departmentQuery = buildDepartmentQuery(department);
  const availableStaff = await User.findOne({
    role: { $in: ["agent", "admin", "owner"] },
    status: { $ne: "busy" },
    ...departmentQuery,
    ...(workspaceId ? { workspaceId } : {}),
  })
    .select("_id workspaceId")
    .sort({ updatedAt: -1 });

  if (availableStaff) return availableStaff;

  return User.findOne({
    role: { $in: ["agent", "admin", "owner"] },
    status: { $ne: "busy" },
    ...(workspaceId ? { workspaceId } : {}),
  })
    .select("_id workspaceId")
    .sort({ updatedAt: -1 });
};

export const isCurrentAssigneeAvailable = async ({
  assigneeId,
  workspaceId,
}) => {
  const normalizedAssigneeId = normalizeId(assigneeId);
  if (!normalizedAssigneeId) return false;

  const assignee = await User.findOne({
    _id: normalizedAssigneeId,
    role: { $in: ["agent", "admin", "owner"] },
    ...(workspaceId ? { workspaceId } : {}),
  }).select("_id status");

  if (!assignee) return false;

  const onlineUsers = new Set(
    await getOnlineUserIdsForWorkspace(workspaceId),
  );
  return onlineUsers.has(normalizedAssigneeId) && assignee.status !== "busy";
};

export const sanitizeMessage = (message) => ({
  _id: normalizeId(message._id),
  conversationId: normalizeId(message.conversationId),
  workspaceId: normalizeId(message.workspaceId),
  senderType: message.senderType,
  senderId: normalizeId(message.senderId),
  content: message.content,
  attachments: sanitizeAttachments(message.attachments),
  createdAt: message.createdAt,
});

export const getOrCreateWorkspaceUsage = async (workspaceId) =>
  Usage.findOneAndUpdate(
    { workspaceId },
    {
      $setOnInsert: {
        workspaceId,
        scope: "workspace",
        conversationsThisMonth: 0,
        aiTokensUsed: 0,
      },
    },
    { upsert: true, new: true },
  );
