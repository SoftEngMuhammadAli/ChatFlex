import { Integration } from "../models/integration.model.js";
import { catchAsyncHandler } from "../middleware/error.middleware.js";
import { dispatchIntegrationById } from "../services/integration.service.js";

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

const VALID_TYPES = new Set([
  "generic-webhook",
  "slack",
  "hubspot",
  "salesforce",
  "zendesk",
  "whatsapp",
  "facebook-messenger",
]);

const normalizeEvents = (events = []) =>
  Array.from(
    new Set(
      (Array.isArray(events) ? events : [])
        .map((event) =>
          String(event || "")
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "_"),
        )
        .filter(Boolean),
    ),
  );

const sanitizeIntegrationPayload = (body = {}) => {
  const type = normalizeText(body.type).toLowerCase();
  return {
    type: VALID_TYPES.has(type) ? type : "generic-webhook",
    name: normalizeText(body.name),
    enabled: body.enabled !== false,
    endpointUrl: normalizeText(body.endpointUrl),
    secret: normalizeText(body.secret),
    token: normalizeText(body.token),
    headers: body.headers && typeof body.headers === "object" ? body.headers : {},
    events: normalizeEvents(body.events),
    settings:
      body.settings && typeof body.settings === "object" ? body.settings : {},
  };
};

export const getIntegrations = catchAsyncHandler(async (req, res) => {
  const ctx = ensureWorkspaceAccess(req, res);
  if (!ctx) return;

  const query = { workspaceId: ctx.workspaceId };
  if (normalizeText(req.query.type)) {
    query.type = normalizeText(req.query.type).toLowerCase();
  }
  if (typeof req.query.enabled !== "undefined") {
    query.enabled = String(req.query.enabled).toLowerCase() !== "false";
  }

  const integrations = await Integration.find(query)
    .sort({ createdAt: -1 })
    .lean();

  return res.status(200).json({ data: integrations });
});

export const createIntegration = catchAsyncHandler(async (req, res) => {
  const ctx = ensureWorkspaceAccess(req, res);
  if (!ctx) return;

  const payload = sanitizeIntegrationPayload(req.body);
  if (!payload.name) {
    return res.status(400).json({ message: "Integration name is required" });
  }

  const integration = await Integration.create({
    workspaceId: ctx.workspaceId,
    ...payload,
  });

  return res.status(201).json({ data: integration });
});

export const updateIntegration = catchAsyncHandler(async (req, res) => {
  const ctx = ensureWorkspaceAccess(req, res);
  if (!ctx) return;

  const payload = {};
  if (Object.prototype.hasOwnProperty.call(req.body, "type")) {
    payload.type = sanitizeIntegrationPayload({ type: req.body.type }).type;
  }
  if (Object.prototype.hasOwnProperty.call(req.body, "name")) {
    payload.name = normalizeText(req.body.name);
  }
  if (Object.prototype.hasOwnProperty.call(req.body, "enabled")) {
    payload.enabled = req.body.enabled !== false;
  }
  if (Object.prototype.hasOwnProperty.call(req.body, "endpointUrl")) {
    payload.endpointUrl = normalizeText(req.body.endpointUrl);
  }
  if (Object.prototype.hasOwnProperty.call(req.body, "secret")) {
    payload.secret = normalizeText(req.body.secret);
  }
  if (Object.prototype.hasOwnProperty.call(req.body, "token")) {
    payload.token = normalizeText(req.body.token);
  }
  if (Object.prototype.hasOwnProperty.call(req.body, "headers")) {
    payload.headers =
      req.body.headers && typeof req.body.headers === "object"
        ? req.body.headers
        : {};
  }
  if (Object.prototype.hasOwnProperty.call(req.body, "events")) {
    payload.events = normalizeEvents(req.body.events);
  }
  if (Object.prototype.hasOwnProperty.call(req.body, "settings")) {
    payload.settings =
      req.body.settings && typeof req.body.settings === "object"
        ? req.body.settings
        : {};
  }

  const integration = await Integration.findOneAndUpdate(
    { _id: req.params.id, workspaceId: ctx.workspaceId },
    payload,
    { new: true, runValidators: true },
  );

  if (!integration) {
    return res.status(404).json({ message: "Integration not found" });
  }

  return res.status(200).json({ data: integration });
});

export const deleteIntegration = catchAsyncHandler(async (req, res) => {
  const ctx = ensureWorkspaceAccess(req, res);
  if (!ctx) return;

  const deleted = await Integration.findOneAndDelete({
    _id: req.params.id,
    workspaceId: ctx.workspaceId,
  });
  if (!deleted) {
    return res.status(404).json({ message: "Integration not found" });
  }

  return res.status(200).json({ message: "Integration deleted" });
});

export const triggerIntegrationTest = catchAsyncHandler(async (req, res) => {
  const ctx = ensureWorkspaceAccess(req, res);
  if (!ctx) return;

  const integration = await Integration.findOne({
    _id: req.params.id,
    workspaceId: ctx.workspaceId,
  });
  if (!integration) {
    return res.status(404).json({ message: "Integration not found" });
  }

  const event = normalizeText(req.body.event || "integration_test").toLowerCase();
  const payload = req.body.payload && typeof req.body.payload === "object"
    ? req.body.payload
    : {};

  const result = await dispatchIntegrationById({
    integrationId: integration._id,
    event,
    payload: {
      ...payload,
      workspaceId: ctx.workspaceId,
      integrationId: String(integration._id),
      integrationType: integration.type,
      message: payload.message || "Integration test event",
    },
  });

  return res.status(200).json({ data: result });
});
