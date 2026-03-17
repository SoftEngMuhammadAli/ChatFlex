import crypto from "crypto";
import axios from "axios";
import { Integration } from "../models/integration.model.js";
import { enqueueIntegrationDispatch } from "../queues/queues.js";

const normalizeEventName = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

const shouldTriggerIntegration = (integration, eventName) => {
  const configuredEvents = Array.isArray(integration?.events)
    ? integration.events
        .map((entry) => normalizeEventName(entry))
        .filter(Boolean)
    : [];

  if (configuredEvents.length === 0) return true;
  return (
    configuredEvents.includes("*") ||
    configuredEvents.includes("all") ||
    configuredEvents.includes(eventName)
  );
};

const buildRequestHeaders = (integration, payloadBody) => {
  const headers = {
    "Content-Type": "application/json",
    ...(integration?.headers && typeof integration.headers === "object"
      ? integration.headers
      : {}),
  };

  const token = String(integration?.token || "").trim();
  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  const secret = String(integration?.secret || "").trim();
  if (secret) {
    const signature = crypto
      .createHmac("sha256", secret)
      .update(JSON.stringify(payloadBody))
      .digest("hex");
    headers["X-ChatFlex-Signature"] = signature;
  }

  return headers;
};

const buildPayloadForIntegration = (integration, eventName, payload) => {
  const basePayload = {
    event: eventName,
    occurredAt: new Date().toISOString(),
    workspaceId: String(payload?.workspaceId || ""),
    data: payload,
  };

  if (integration?.type === "slack") {
    const preview =
      String(payload?.message || "").trim() ||
      String(payload?.conversationId || "").trim() ||
      "New ChatFlex event";
    return {
      text: `[ChatFlex] ${eventName}: ${preview}`,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Event:* ${eventName}\n*Workspace:* ${basePayload.workspaceId || "n/a"}\n*Details:* ${preview}`,
          },
        },
      ],
      chatflex: basePayload,
    };
  }

  return basePayload;
};

const dispatchToSingleIntegration = async (integration, eventName, payload) => {
  const endpoint = String(integration?.endpointUrl || "").trim();
  if (!endpoint) {
    await Integration.findByIdAndUpdate(integration._id, {
      lastError: "Missing endpointUrl",
    });
    return { delivered: false, reason: "missing_endpoint" };
  }

  const body = buildPayloadForIntegration(integration, eventName, payload);
  const headers = buildRequestHeaders(integration, body);

  try {
    await axios.post(endpoint, body, {
      headers,
      timeout: 8000,
      maxContentLength: 1024 * 1024,
      maxBodyLength: 1024 * 1024,
    });

    await Integration.findByIdAndUpdate(integration._id, {
      lastSyncAt: new Date(),
      lastError: "",
    });

    return { delivered: true };
  } catch (error) {
    const reason = String(
      error?.response?.data?.message || error?.message || "Integration failed",
    )
      .trim()
      .slice(0, 500);

    await Integration.findByIdAndUpdate(integration._id, {
      lastError: reason,
    });

    return { delivered: false, reason };
  }
};

export const dispatchIntegrationById = async ({
  integrationId,
  event,
  payload = {},
} = {}) => {
  const normalizedEvent = normalizeEventName(event);
  if (!integrationId || !normalizedEvent) {
    return { delivered: false, reason: "invalid_input" };
  }

  const integration = await Integration.findById(integrationId).lean();
  if (!integration || integration.enabled === false) {
    return { delivered: false, reason: "integration_not_found" };
  }

  if (!shouldTriggerIntegration(integration, normalizedEvent)) {
    return { delivered: false, reason: "event_not_configured" };
  }

  return dispatchToSingleIntegration(integration, normalizedEvent, {
    ...payload,
    workspaceId: String(payload?.workspaceId || integration.workspaceId || ""),
  });
};

export const dispatchIntegrationEvent = async ({
  workspaceId,
  event,
  payload = {},
} = {}) => {
  const shouldInline =
    String(process.env.INTEGRATION_DELIVERY_MODE || "").trim().toLowerCase() ===
    "inline";
  if (!shouldInline) {
    const queued = await enqueueIntegrationDispatch({
      workspaceId,
      event,
      payload,
    });
    if (queued.queued) {
      return { delivered: 0, attempted: 0, queued: true, jobId: queued.jobId };
    }
  }
  return dispatchIntegrationEventNow({ workspaceId, event, payload });
};

export const dispatchIntegrationEventNow = async ({
  workspaceId,
  event,
  payload = {},
} = {}) => {
  const normalizedEvent = normalizeEventName(event);
  if (!workspaceId || !normalizedEvent) {
    return { delivered: 0, attempted: 0 };
  }

  const integrations = await Integration.find({
    workspaceId,
    enabled: true,
  }).lean();

  if (integrations.length === 0) return { delivered: 0, attempted: 0 };

  const matchingIntegrations = integrations.filter((integration) =>
    shouldTriggerIntegration(integration, normalizedEvent),
  );

  if (matchingIntegrations.length === 0) {
    return { delivered: 0, attempted: 0 };
  }

  const results = await Promise.all(
    matchingIntegrations.map((integration) =>
      dispatchToSingleIntegration(integration, normalizedEvent, {
        ...payload,
        workspaceId,
      }),
    ),
  );

  return {
    attempted: matchingIntegrations.length,
    delivered: results.filter((item) => item.delivered).length,
    failed: results.filter((item) => !item.delivered).length,
  };
};
