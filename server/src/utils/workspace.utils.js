import mongoose from "mongoose";
import { Workspace } from "../models/workspace.model.js";

const FALLBACK_WORKSPACE_NAME = "My Workspace";

const normalizeWorkspaceName = (input, fallback = FALLBACK_WORKSPACE_NAME) => {
  const value = String(input || "").trim();
  if (value) return value;
  return fallback;
};

const deriveDefaultWorkspaceName = (user, workspaceName = "") => {
  const preferred = normalizeWorkspaceName(workspaceName, "");
  if (preferred) return preferred;

  const userName = String(user?.name || "").trim();
  if (userName) return `${userName}'s Workspace`;

  const emailPrefix = String(user?.email || "")
    .split("@")[0]
    .trim();
  if (emailPrefix) return `${emailPrefix}'s Workspace`;

  return FALLBACK_WORKSPACE_NAME;
};

const sanitizeAllowedDomains = (domains) => {
  if (!Array.isArray(domains)) return [];
  return Array.from(
    new Set(
      domains
        .map((domain) => String(domain || "").trim().toLowerCase())
        .filter(Boolean),
    ),
  );
};

export const resolveWorkspaceId = (value) => {
  const normalized = String(value || "").trim();
  return mongoose.Types.ObjectId.isValid(normalized) ? normalized : "";
};

export const ensureWorkspaceForUser = async (user, options = {}) => {
  if (!user || String(user.role || "") === "super-admin") return null;

  const requestedWorkspaceId = resolveWorkspaceId(user.workspaceId);
  let workspace = requestedWorkspaceId
    ? await Workspace.findById(requestedWorkspaceId)
    : null;

  if (!workspace) {
    const workspacePayload = {
      ...(requestedWorkspaceId ? { _id: requestedWorkspaceId } : {}),
      name: deriveDefaultWorkspaceName(user, options.workspaceName),
      ownerId: user._id,
      plan: String(options.plan || "starter"),
      limits: options.limits || undefined,
      apiKey: options.apiKey || undefined,
      allowedDomains: sanitizeAllowedDomains(options.allowedDomains),
      brandSettings: options.brandSettings || undefined,
      aiSettings: options.aiSettings || undefined,
    };
    workspace = await Workspace.create(workspacePayload);
  }

  if (String(user.workspaceId || "") !== String(workspace._id)) {
    user.workspaceId = workspace._id;
    await user.save();
  }

  return workspace;
};

export const getWorkspaceForRequest = async (req, options = {}) => {
  const role = String(req.user?.role || "");
  const isSuperAdmin = role === "super-admin";
  const explicitWorkspaceId =
    resolveWorkspaceId(options.workspaceId) ||
    resolveWorkspaceId(req.query?.workspaceId) ||
    resolveWorkspaceId(req.body?.workspaceId) ||
    resolveWorkspaceId(req.user?.workspaceId);

  if (isSuperAdmin) {
    if (explicitWorkspaceId) {
      return Workspace.findById(explicitWorkspaceId);
    }
    return Workspace.findOne({}).sort({ createdAt: 1 });
  }

  if (!req.user) return null;
  return ensureWorkspaceForUser(req.user, options);
};

export const buildWorkspaceSettingsPayload = (workspace) => ({
  workspaceId: workspace?._id || null,
  appName: workspace?.name || "ChatFlex",
  name: workspace?.name || "ChatFlex",
  widgetApiKey: workspace?.apiKey || "",
  settings: workspace?.brandSettings || {},
  limits: workspace?.limits || {},
  aiSettings: workspace?.aiSettings || {},
  allowedDomains: Array.isArray(workspace?.allowedDomains)
    ? workspace.allowedDomains
    : [],
});

export const getWorkspaceContext = (req) => {
  const role = String(req.user?.role || "");
  const isSuperAdmin = role === "super-admin";
  return {
    isSuperAdmin,
    workspaceId: resolveWorkspaceId(req.user?.workspaceId),
  };
};
