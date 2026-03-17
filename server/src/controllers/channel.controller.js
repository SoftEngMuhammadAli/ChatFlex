import axios from "axios";
import { Integration } from "../models/integration.model.js";
import { Conversation } from "../models/conversation.model.js";
import { Message } from "../models/message.model.js";
import { catchAsyncHandler } from "../middleware/error.middleware.js";
import {
  getOrCreateWidgetVisitorUser,
  normalizeId,
  pickDefaultAgent,
} from "./widget.shared.js";
import { executeAutomationRules } from "../services/automation.service.js";
import { dispatchIntegrationEvent } from "../services/integration.service.js";
import { decryptSecret } from "../utils/crypto.util.js";

const normalizeText = (value) => String(value || "").trim();

const getSocketIo = (req) => req.app?.get("io");

const resolveIntegration = async ({ integrationId, expectedType }) => {
  const integration = await Integration.findById(integrationId);
  if (!integration || integration.enabled === false) return null;
  if (expectedType && integration.type !== expectedType) return null;
  return integration;
};

const metaVerify = (integration, req) => {
  const mode = normalizeText(req.query["hub.mode"]);
  const token = normalizeText(req.query["hub.verify_token"]);
  const challenge = normalizeText(req.query["hub.challenge"]);

  const expected = decryptSecret(integration?.secret);
  if (!expected) return { ok: false, status: 400, body: "Missing verify token" };
  if (mode !== "subscribe" || token !== expected) {
    return { ok: false, status: 403, body: "Forbidden" };
  }
  return { ok: true, status: 200, body: challenge || "OK" };
};

const ensureConversationForChannel = async ({
  workspaceId,
  visitorId,
  channel,
  recipientId,
  visitorMetadata = {},
  department = "",
}) => {
  const visitorUser = await getOrCreateWidgetVisitorUser({
    visitorId,
    metadata: visitorMetadata,
    workspaceId,
  });

  const query = {
    workspaceId,
    visitorId,
    status: { $in: ["open", "pending"] },
    "metadata.channel": channel,
    "metadata.channelRecipientId": recipientId,
  };

  let conversation = await Conversation.findOne(query).sort({ updatedAt: -1 });
  if (!conversation) {
    conversation = await Conversation.create({
      workspaceId,
      visitorId,
      visitorUserId: visitorUser._id,
      ...(department ? { department } : {}),
      status: "open",
      metadata: {
        ...(visitorMetadata || {}),
        channel,
        channelRecipientId: recipientId,
      },
    });
  } else {
    if (!conversation.visitorUserId) {
      conversation.visitorUserId = visitorUser._id;
    }
    conversation.metadata = {
      ...(conversation.metadata || {}),
      ...(visitorMetadata || {}),
      channel,
      channelRecipientId: recipientId,
    };
    if (department && !conversation.department) {
      conversation.department = department;
    }
    if (conversation.status === "resolved") conversation.status = "open";
    await conversation.save();
  }

  if (!conversation.assignedTo && !conversation.assignedAgent) {
    const agent = await pickDefaultAgent({ workspaceId, department });
    if (agent) {
      conversation.assignedTo = agent._id;
      conversation.assignedAgent = agent._id;
      await conversation.save();
    }
  }

  return { conversation, visitorUser };
};

const emitRealtimeToAssignee = async ({ io, conversation, message }) => {
  if (!io || !conversation || !message) return;
  const receiverId = normalizeId(conversation.assignedTo || conversation.assignedAgent);
  if (!receiverId) return;
  io.to(receiverId).emit("channel_message_received", {
    workspaceId: normalizeId(conversation.workspaceId),
    conversationId: normalizeId(conversation._id),
    messageId: normalizeId(message._id),
    channel: String(conversation?.metadata?.channel || ""),
    content: String(message.content || ""),
    createdAt: message.createdAt,
  });
};

const parseWhatsappMessages = (body) => {
  const entries = Array.isArray(body?.entry) ? body.entry : [];
  const out = [];
  for (const entry of entries) {
    const changes = Array.isArray(entry?.changes) ? entry.changes : [];
    for (const change of changes) {
      const value = change?.value || {};
      const messages = Array.isArray(value?.messages) ? value.messages : [];
      for (const msg of messages) {
        const from = normalizeText(msg?.from);
        if (!from) continue;
        const type = normalizeText(msg?.type);
        let text = "";
        if (type === "text") text = normalizeText(msg?.text?.body);
        if (!text) text = `[${type || "message"}]`;
        out.push({
          from,
          text,
          messageId: normalizeText(msg?.id),
          timestamp: normalizeText(msg?.timestamp),
        });
      }
    }
  }
  return out;
};

const parseMessengerMessages = (body) => {
  const entries = Array.isArray(body?.entry) ? body.entry : [];
  const out = [];
  for (const entry of entries) {
    const messaging = Array.isArray(entry?.messaging) ? entry.messaging : [];
    for (const evt of messaging) {
      const senderId = normalizeText(evt?.sender?.id);
      if (!senderId) continue;
      const text = normalizeText(evt?.message?.text) || "[message]";
      out.push({
        from: senderId,
        text,
        mid: normalizeText(evt?.message?.mid),
        timestamp: normalizeText(evt?.timestamp),
      });
    }
  }
  return out;
};

export const verifyWhatsAppWebhook = catchAsyncHandler(async (req, res) => {
  const integration = await resolveIntegration({
    integrationId: req.params.integrationId,
    expectedType: "whatsapp",
  });
  if (!integration) return res.status(404).send("Not found");
  const result = metaVerify(integration, req);
  return res.status(result.status).send(result.body);
});

export const receiveWhatsAppWebhook = catchAsyncHandler(async (req, res) => {
  const integration = await resolveIntegration({
    integrationId: req.params.integrationId,
    expectedType: "whatsapp",
  });
  if (!integration) return res.status(404).json({ ok: false });

  const workspaceId = normalizeId(integration.workspaceId);
  const channelRecipientId =
    normalizeText(integration?.settings?.phoneNumberId) ||
    normalizeText(integration?.settings?.phone_number_id) ||
    normalizeText(integration?.settings?.recipientId);

  const messages = parseWhatsappMessages(req.body);
  for (const item of messages) {
    const visitorId = `wa:${item.from}`;
    const { conversation, visitorUser } = await ensureConversationForChannel({
      workspaceId,
      visitorId,
      channel: "whatsapp",
      recipientId: channelRecipientId || "whatsapp",
      visitorMetadata: {
        name: normalizeText(req.body?.contacts?.[0]?.profile?.name),
        phone: item.from,
      },
      department: normalizeText(integration?.settings?.department),
    });

    const message = await Message.create({
      conversationId: conversation._id,
      workspaceId,
      senderType: "visitor",
      senderId: visitorUser?._id || undefined,
      receiverId: conversation.assignedTo || conversation.assignedAgent || undefined,
      content: item.text,
    });

    conversation.lastMessageAt = new Date();
    await conversation.save();

    await emitRealtimeToAssignee({
      io: getSocketIo(req),
      conversation,
      message,
    });

    await executeAutomationRules({
      workspaceId,
      trigger: "visitor_message",
      conversation,
      message,
      senderType: "visitor",
      actorId: normalizeId(visitorUser?._id),
    });

    await dispatchIntegrationEvent({
      workspaceId,
      event: "new_message",
      payload: {
        conversationId: normalizeId(conversation._id),
        messageId: normalizeId(message._id),
        senderType: "visitor",
        message: String(message.content || ""),
        department: String(conversation.department || ""),
        source: "whatsapp",
      },
    });
  }

  return res.status(200).json({ ok: true });
});

export const verifyMessengerWebhook = catchAsyncHandler(async (req, res) => {
  const integration = await resolveIntegration({
    integrationId: req.params.integrationId,
    expectedType: "facebook-messenger",
  });
  if (!integration) return res.status(404).send("Not found");
  const result = metaVerify(integration, req);
  return res.status(result.status).send(result.body);
});

export const receiveMessengerWebhook = catchAsyncHandler(async (req, res) => {
  const integration = await resolveIntegration({
    integrationId: req.params.integrationId,
    expectedType: "facebook-messenger",
  });
  if (!integration) return res.status(404).json({ ok: false });

  const workspaceId = normalizeId(integration.workspaceId);
  const pageId =
    normalizeText(integration?.settings?.pageId) ||
    normalizeText(integration?.settings?.page_id) ||
    "messenger";

  const events = parseMessengerMessages(req.body);
  for (const item of events) {
    const visitorId = `msgr:${item.from}`;
    const { conversation, visitorUser } = await ensureConversationForChannel({
      workspaceId,
      visitorId,
      channel: "facebook-messenger",
      recipientId: pageId,
      visitorMetadata: {
        name: "",
      },
      department: normalizeText(integration?.settings?.department),
    });

    const message = await Message.create({
      conversationId: conversation._id,
      workspaceId,
      senderType: "visitor",
      senderId: visitorUser?._id || undefined,
      receiverId: conversation.assignedTo || conversation.assignedAgent || undefined,
      content: item.text,
    });

    conversation.lastMessageAt = new Date();
    await conversation.save();

    await emitRealtimeToAssignee({
      io: getSocketIo(req),
      conversation,
      message,
    });

    await executeAutomationRules({
      workspaceId,
      trigger: "visitor_message",
      conversation,
      message,
      senderType: "visitor",
      actorId: normalizeId(visitorUser?._id),
    });

    await dispatchIntegrationEvent({
      workspaceId,
      event: "new_message",
      payload: {
        conversationId: normalizeId(conversation._id),
        messageId: normalizeId(message._id),
        senderType: "visitor",
        message: String(message.content || ""),
        department: String(conversation.department || ""),
        source: "facebook-messenger",
      },
    });
  }

  return res.status(200).json({ ok: true });
});

export const sendMetaMessage = catchAsyncHandler(async (req, res) => {
  const integration = await resolveIntegration({
    integrationId: req.params.integrationId,
  });
  if (!integration) return res.status(404).json({ message: "Integration not found" });

  if (!["whatsapp", "facebook-messenger"].includes(integration.type)) {
    return res.status(400).json({ message: "Unsupported channel type" });
  }

  const workspaceId = normalizeId(integration.workspaceId);
  const conversationId = normalizeText(req.body?.conversationId);
  const recipient = normalizeText(req.body?.recipient);
  const text = normalizeText(req.body?.text);
  if (!text) return res.status(400).json({ message: "text is required" });

  let conversation = null;
  if (conversationId) {
    conversation = await Conversation.findOne({ _id: conversationId, workspaceId });
  }

  const accessToken = decryptSecret(integration.token);
  if (!accessToken) {
    return res.status(400).json({ message: "Missing access token" });
  }

  const channel = integration.type;
  const channelRecipientId =
    channel === "whatsapp"
      ? normalizeText(integration?.settings?.phoneNumberId || integration?.settings?.phone_number_id)
      : normalizeText(integration?.settings?.pageId || integration?.settings?.page_id);

  const visitorChannelId =
    recipient ||
    normalizeText(conversation?.metadata?.channelVisitorId) ||
    normalizeText(conversation?.visitorId || "").split(":")[1];

  if (!visitorChannelId) {
    return res.status(400).json({ message: "recipient is required" });
  }

  if (channel === "whatsapp") {
    if (!channelRecipientId) {
      return res.status(400).json({ message: "Missing phoneNumberId in integration settings" });
    }
    await axios.post(
      `https://graph.facebook.com/v20.0/${encodeURIComponent(channelRecipientId)}/messages`,
      {
        messaging_product: "whatsapp",
        to: visitorChannelId,
        type: "text",
        text: { body: text },
      },
      { headers: { Authorization: `Bearer ${accessToken}` }, timeout: 10_000 },
    );
  } else {
    await axios.post(
      `https://graph.facebook.com/v20.0/me/messages`,
      {
        recipient: { id: visitorChannelId },
        message: { text },
      },
      { params: { access_token: accessToken }, timeout: 10_000 },
    );
  }

  // Record as an agent message in the conversation thread if a conversation exists.
  if (conversation) {
    const msg = await Message.create({
      conversationId: conversation._id,
      workspaceId,
      senderType: "agent",
      senderId: req.user?._id || undefined,
      receiverId: conversation.visitorUserId || undefined,
      content: text,
    });
    conversation.lastMessageAt = new Date();
    await conversation.save();
    return res.status(200).json({ ok: true, data: { messageId: normalizeId(msg._id) } });
  }

  return res.status(200).json({ ok: true });
});

