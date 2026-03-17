// Public widget APIs for visitor session, assignment, and message history.
import { Conversation } from "../models/conversation.model.js";
import { Message } from "../models/message.model.js";
import { User } from "../models/user.model.js";
import { FAQ } from "../models/faq.model.js";
import { Workspace } from "../models/workspace.model.js";
import { catchAsyncHandler } from "../middleware/error.middleware.js";
import {
  normalizeId,
  getDefaultWorkspace,
  validateWidgetAccess,
  parseAfterDate,
  sanitizeAttachments,
  sanitizeFaq,
  findWidgetVisitorUser,
  getOrCreateWidgetVisitorUser,
  createWidgetSocketToken,
  pickDefaultAgent,
  isCurrentAssigneeAvailable,
  sanitizeMessage,
  getOrCreateWorkspaceUsage,
} from "./widget.shared.js";
import { emitUnreadCounts } from "../sockets/socketEmitters.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { executeAutomationRules } from "../services/automation.service.js";
import { dispatchIntegrationEvent } from "../services/integration.service.js";

const resolveOriginHost = (req) => {
  const candidates = [
    req.get("origin"),
    req.get("referer"),
    req.headers.origin,
    req.headers.referer,
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      const url = new URL(candidate);
      if (url.hostname) return String(url.hostname).toLowerCase();
    } catch {
      continue;
    }
  }

  return "";
};

const getSocketIo = (req) => req.app?.get("io");

const resolveTemplateWorkspaceId = async (template) => {
  const directWorkspaceId = normalizeId(template?.workspaceId);
  if (directWorkspaceId) return directWorkspaceId;

  const createdById = normalizeId(template?.createdBy);
  if (!createdById) return "";

  const creator = await User.findById(createdById).select("workspaceId");
  return normalizeId(creator?.workspaceId);
};

const buildWorkspaceScopeFromAccess = async (access) => {
  if (access?.mode === "template") {
    const templateWorkspaceId = await resolveTemplateWorkspaceId(
      access?.template,
    );
    return templateWorkspaceId ? { workspaceId: templateWorkspaceId } : {};
  }

  const workspaceId = normalizeId(access?.workspace?._id);
  return workspaceId ? { workspaceId } : {};
};

const pickFirstNonEmptyString = (...values) => {
  for (const value of values) {
    const normalized = String(value || "").trim();
    if (normalized) return normalized;
  }
  return "";
};

const normalizeSuggestedMessagesForWidget = (
  suggestedMessages,
  faqItems = [],
) => {
  if (!Array.isArray(suggestedMessages)) return [];

  const faqAnswerByQuestion = new Map(
    (Array.isArray(faqItems) ? faqItems : [])
      .map((item) => ({
        question: String(item?.question || "")
          .trim()
          .toLowerCase(),
        answer: String(item?.answer || "").trim(),
      }))
      .filter((item) => item.question && item.answer)
      .map((item) => [item.question, item.answer]),
  );

  return suggestedMessages
    .map((item) => {
      if (typeof item === "string") {
        const message = String(item || "").trim();
        if (!message) return null;
        return {
          message,
          answer:
            faqAnswerByQuestion.get(message.toLowerCase()) ||
            "Thanks for your message. A support agent will assist you shortly.",
        };
      }

      if (!item || typeof item !== "object") return null;
      const message = String(
        item.message || item.text || item.question || "",
      ).trim();
      if (!message) return null;

      const answer =
        String(item.answer || item.reply || "").trim() ||
        faqAnswerByQuestion.get(message.toLowerCase()) ||
        "Thanks for your message. A support agent will assist you shortly.";

      return { message, answer };
    })
    .filter(Boolean);
};

const VISITOR_NAME_REGEX = /^[A-Za-z]+(?:[ '-][A-Za-z]+)*$/;
const BLOCKED_CONTEXT_METADATA_KEYS = new Set([
  "ip",
  "country",
  "pageUrl",
  "userAgent",
  "language",
  "connectedAt",
]);

const normalizeVisitorName = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ");

const isValidVisitorName = (value) => {
  const normalized = normalizeVisitorName(value);
  if (!normalized) return false;
  const letterCount = (normalized.match(/[A-Za-z]/g) || []).length;
  if (letterCount < 3) return false;
  return VISITOR_NAME_REGEX.test(normalized);
};

const sanitizeVisitorMetadata = (inputMetadata) => {
  if (!inputMetadata || typeof inputMetadata !== "object") return {};
  const sanitized = {};
  Object.keys(inputMetadata).forEach((key) => {
    if (!BLOCKED_CONTEXT_METADATA_KEYS.has(String(key || "").trim())) {
      sanitized[key] = inputMetadata[key];
    }
  });
  return sanitized;
};

const resolveWidgetScope = ({ access, widgetId }) => {
  if (access?.mode === "template") {
    const templateId = normalizeId(access?.template?._id || widgetId);
    return {
      mode: "template",
      scopeKey: templateId ? `template:${templateId}` : "template:unknown",
      templateId,
      templateName: String(access?.template?.name || "").trim(),
    };
  }

  return {
    mode: "workspace",
    scopeKey: "workspace:default",
    templateId: "",
    templateName: "",
  };
};

const buildWidgetMetadata = ({ access, widgetId }) => {
  const resolved = resolveWidgetScope({ access, widgetId });
  return {
    widgetMode: resolved.mode,
    widgetScopeKey: resolved.scopeKey,
    ...(resolved.templateId ? { widgetTemplateId: resolved.templateId } : {}),
    ...(resolved.templateName
      ? { widgetTemplateName: resolved.templateName }
      : {}),
  };
};

const extractVisitorProfileFromMetadata = (metadata) => {
  const data = metadata && typeof metadata === "object" ? metadata : {};
  const name = normalizeVisitorName(
    pickFirstNonEmptyString(
      data.name,
      data.Name,
      data.full_name,
      data.fullName,
      data.visitorName,
    ),
  );
  const email = pickFirstNonEmptyString(
    data.email,
    data.Email,
    data.email_address,
    data.emailAddress,
  ).toLowerCase();
  const phone = pickFirstNonEmptyString(
    data.phone,
    data.Phone,
    data.phone_number,
    data.phoneNumber,
    data.mobile,
  );

  return { name, email, phone };
};

const detectMessageLanguage = (text) => {
  const content = String(text || "").trim();
  if (!content) return "en";
  if (/[\u0600-\u06FF]/.test(content)) return "ur";
  if (/[\u4E00-\u9FFF]/.test(content)) return "zh";
  if (/[\u3040-\u30ff]/.test(content)) return "ja";
  if (/\b(hola|gracias|por favor|ayuda|necesito)\b/i.test(content)) return "es";
  if (/\b(bonjour|merci|sil vous plait|aide|besoin)\b/i.test(content)) return "fr";
  if (/\b(hallo|danke|hilfe|bitte)\b/i.test(content)) return "de";
  if (/\b(ciao|grazie|aiuto|per favore)\b/i.test(content)) return "it";
  if (/\b(olá|obrigado|ajuda|preciso)\b/i.test(content)) return "pt";
  if (/[\u0900-\u097F]/.test(content)) return "hi";
  return "en";
};

const resolveLanguageFromRequest = (req, metadata = {}) => {
  const metadataLanguage = pickFirstNonEmptyString(
    metadata.language,
    metadata.languageCode,
    metadata.locale,
    metadata.lang,
  );
  if (metadataLanguage) {
    return String(metadataLanguage).toLowerCase().split(/[-_]/)[0];
  }

  const acceptLanguage = String(
    req.headers["accept-language"] || req.get("accept-language") || "",
  ).trim();
  if (!acceptLanguage) return "en";

  const primary = acceptLanguage.split(",")[0] || "";
  return String(primary).toLowerCase().split(/[-_]/)[0] || "en";
};

const resolveClientIp = (req) => {
  const forwarded = String(req.headers["x-forwarded-for"] || "").trim();
  if (forwarded) {
    const first = forwarded.split(",")[0];
    if (first) return first.trim();
  }
  return String(req.ip || req.socket?.remoteAddress || "").trim();
};

const resolveVisitorCountry = (req, metadata = {}) => {
  const hintedCountry = pickFirstNonEmptyString(
    metadata.country,
    metadata.countryCode,
    metadata.country_name,
  );
  if (hintedCountry) return hintedCountry;

  return pickFirstNonEmptyString(
    req.headers["cf-ipcountry"],
    req.headers["x-country-code"],
    req.headers["x-vercel-ip-country"],
    req.headers["x-geo-country"],
  );
};

const resolveVisitorPageUrl = (req, metadata = {}) => {
  const hintedPageUrl = pickFirstNonEmptyString(
    metadata.pageUrl,
    metadata.page,
    metadata.page_url,
    metadata.url,
  );
  if (hintedPageUrl) return hintedPageUrl;
  return pickFirstNonEmptyString(req.headers.referer, req.get("referer"));
};

const buildTrustedVisitorContext = (req, metadata = {}) => {
  const pageUrl = resolveVisitorPageUrl(req, metadata);
  return {
    ip: resolveClientIp(req),
    country: resolveVisitorCountry(req, metadata),
    pageUrl,
    userAgent: String(req.headers["user-agent"] || "").trim(),
    language: resolveLanguageFromRequest(req, metadata),
    connectedAt: new Date().toISOString(),
  };
};

const parseTimeToMinutes = (raw, fallback) => {
  const candidate = String(raw || fallback || "").trim();
  const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(candidate);
  if (!match) return parseTimeToMinutes(fallback, "09:00");
  return Number(match[1]) * 60 + Number(match[2]);
};

const normalizeBusinessHours = (settings = {}) => ({
  enabled: settings?.enabled === true,
  timezone: String(settings?.timezone || "UTC").trim() || "UTC",
  weekdays: Array.isArray(settings?.weekdays)
    ? settings.weekdays
        .map((item) => Number(item))
        .filter((item) => Number.isInteger(item) && item >= 0 && item <= 6)
    : [1, 2, 3, 4, 5],
  startTime: String(settings?.startTime || "09:00").trim() || "09:00",
  endTime: String(settings?.endTime || "18:00").trim() || "18:00",
  autoReplyEnabled: settings?.autoReplyEnabled !== false,
  autoReplyMessage: String(settings?.autoReplyMessage || "")
    .trim(),
});

const getBusinessHoursAutoReplyMessage = (settings = {}) => {
  const normalized = normalizeBusinessHours(settings);
  return (
    normalized.autoReplyMessage ||
    "Thanks for reaching out. Our team is currently offline, but we have received your message and will reply in business hours."
  );
};

const isWithinBusinessHours = (businessHoursInput = {}) => {
  const businessHours = normalizeBusinessHours(businessHoursInput);
  if (!businessHours.enabled) return true;

  const weekdays =
    businessHours.weekdays.length > 0 ? businessHours.weekdays : [1, 2, 3, 4, 5];
  const startMinutes = parseTimeToMinutes(businessHours.startTime, "09:00");
  const endMinutes = parseTimeToMinutes(businessHours.endTime, "18:00");

  let parts;
  try {
    parts = new Intl.DateTimeFormat("en-US", {
      timeZone: businessHours.timezone || "UTC",
      hour12: false,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).formatToParts(new Date());
  } catch {
    parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      hour12: false,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).formatToParts(new Date());
  }

  const weekdayName = String(
    parts.find((part) => part.type === "weekday")?.value || "Mon",
  );
  const weekdayMap = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const weekday = weekdayMap[weekdayName] ?? 1;
  if (!weekdays.includes(weekday)) return false;

  const hours = Number(parts.find((part) => part.type === "hour")?.value || 0);
  const minutes = Number(
    parts.find((part) => part.type === "minute")?.value || 0,
  );
  const nowMinutes = hours * 60 + minutes;
  if (startMinutes <= endMinutes) {
    return nowMinutes >= startMinutes && nowMinutes <= endMinutes;
  }
  return nowMinutes >= startMinutes || nowMinutes <= endMinutes;
};

const normalizeDepartmentOption = (item, index) => {
  const key = String(item?.key || item?.value || item?.label || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
  const label =
    String(item?.label || item?.name || "")
      .trim() || (key ? key.replace(/-/g, " ") : "");
  if (!key || !label) return null;
  return {
    key,
    label,
    routingTags: Array.isArray(item?.routingTags)
      ? item.routingTags.map((tag) => String(tag || "").trim()).filter(Boolean)
      : [],
    isDefault: item?.isDefault === true || index === 0,
  };
};

const normalizeDepartmentSelection = (input = {}) => {
  const options = Array.isArray(input?.options)
    ? input.options.map(normalizeDepartmentOption).filter(Boolean)
    : [];
  const fallbackOptions =
    options.length > 0
      ? options
      : [
          { key: "sales", label: "Sales", routingTags: ["sales"], isDefault: true },
          {
            key: "support",
            label: "Support",
            routingTags: ["support"],
            isDefault: false,
          },
        ];

  return {
    enabled: input?.enabled === true,
    options: fallbackOptions,
  };
};

const resolveDepartmentSelectionSettings = (access) => {
  if (access?.mode === "template") {
    return normalizeDepartmentSelection(access?.template?.departmentSelection);
  }
  return normalizeDepartmentSelection(
    access?.workspace?.brandSettings?.departmentSelection,
  );
};

const resolveBusinessHoursSettings = (access) => {
  if (access?.mode === "template") {
    return normalizeBusinessHours(access?.template?.businessHours);
  }
  return normalizeBusinessHours(access?.workspace?.brandSettings?.businessHours);
};

const resolveRequestedDepartment = ({
  requestedDepartment,
  metadata = {},
  selectionSettings,
}) => {
  const options = Array.isArray(selectionSettings?.options)
    ? selectionSettings.options
    : [];
  const selected =
    String(
      requestedDepartment ||
        metadata.department ||
        metadata.departmentKey ||
        metadata.department_name ||
        "",
    )
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-") || "";

  if (selectionSettings?.enabled !== true) {
    return selected;
  }

  if (!selected || options.length === 0) {
    const fallback = options.find((item) => item.isDefault) || options[0];
    return String(fallback?.key || "");
  }

  const byKey = options.find((item) => String(item.key) === selected);
  if (byKey) return byKey.key;

  const byLabel = options.find(
    (item) =>
      String(item.label || "")
        .trim()
        .toLowerCase() === selected.replace(/-/g, " "),
  );
  if (byLabel) return byLabel.key;

  return "";
};

const emitWidgetMessageRealtime = async ({
  io,
  message,
  conversation,
  senderName = "Visitor",
}) => {
  if (!io || !message) return;

  const senderId = normalizeId(message.senderId);
  const receiverId = normalizeId(
    message.receiverId ||
      conversation?.assignedTo ||
      conversation?.assignedAgent,
  );
  const payload = {
    _id: normalizeId(message._id),
    senderId,
    senderName,
    receiverId,
    visitorId: conversation?.visitorId || "",
    conversationId: normalizeId(message.conversationId || conversation?._id),
    content: message.content || "",
    attachments: sanitizeAttachments(message.attachments),
    role: "visitor",
    workspaceId: normalizeId(message.workspaceId || conversation?.workspaceId),
    timestamp: message.createdAt,
  };

  if (receiverId) {
    io.to(receiverId).emit("new_private_message", payload);
    await emitUnreadCounts({
      io,
      userId: receiverId,
      workspaceId: normalizeId(message.workspaceId || conversation?.workspaceId),
    });
  }
  if (senderId) {
    io.to(senderId).emit("message_sent", payload);
  }
};

const emitMessageMutationRealtime = ({ io, message, type, messageId = "" }) => {
  if (!io || !message) return;
  const senderId = normalizeId(message.senderId);
  const receiverId = normalizeId(message.receiverId);
  const participants = [senderId, receiverId].filter(Boolean);
  if (participants.length === 0) return;

  if (type === "updated") {
    const payload = {
      _id: normalizeId(message._id),
      senderId,
      receiverId,
      senderType: message.senderType,
      content: message.content || "",
      attachments: sanitizeAttachments(message.attachments),
      conversationId: normalizeId(message.conversationId),
      workspaceId: normalizeId(message.workspaceId),
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
    };
    participants.forEach((userId) =>
      io.to(userId).emit("message_updated", payload),
    );
    return;
  }

  if (type === "deleted") {
    const payload = {
      messageId: normalizeId(messageId || message._id),
      senderId,
      receiverId,
    };
    participants.forEach((userId) =>
      io.to(userId).emit("message_deleted", payload),
    );
  }
};

export const getWidgetConfig = catchAsyncHandler(async (req, res) => {
  const apiKey = req.query.apiKey || req.body?.apiKey;
  const widgetId = req.query.widgetId || req.body?.widgetId;
  const widgetToken = req.query.widgetToken || req.body?.widgetToken;
  const visitorEmail = req.query.visitorEmail || req.body?.visitorEmail;

  const access = await validateWidgetAccess({
    apiKey,
    widgetId,
    widgetToken,
    visitorEmail,
    originHost: resolveOriginHost(req),
    enforceVisitorIdentity: false,
  });

  if (access?.denied) {
    return res.status(403).json({ message: access.reason });
  }

  if (!access) {
    return res.status(401).json({ message: "Invalid API key" });
  }

  if (access.mode === "template") {
    const template = access.template;
    const templateWorkspaceId = await resolveTemplateWorkspaceId(template);
    const isTemplateFaqsEnabled = template?.showFaqs !== false;

    const templateFaqs = Array.isArray(template.faqItems)
      ? template.faqItems
          .map((faq, index) =>
            sanitizeFaq({
              _id: faq._id || `template-faq-${index + 1}`,
              question: faq.question,
              answer: faq.answer,
              category: faq.category || "",
              status: faq.status || "published",
            }),
          )
          .filter(
            (faq) =>
              faq.question &&
              faq.answer &&
              String(faq.status || "published").toLowerCase() !== "unpublished",
          )
      : [];
    const templateSuggestedMessages = normalizeSuggestedMessagesForWidget(
      template?.suggestedMessages,
      templateFaqs,
    );
    const templateAutoReplySuggestions =
      template?.autoReplySuggestions !== false;
    const templateDepartmentSelection = normalizeDepartmentSelection(
      template?.departmentSelection,
    );
    const templateBusinessHours = normalizeBusinessHours(template?.businessHours);

    return res.status(200).json({
      data: {
        workspaceId: templateWorkspaceId,
        workspaceName: template.name || "ChatFlex",
        settings: {
          brandColor: template.brandColor,
          logoUrl: template.logoUrl,
          welcomeMessage: template.welcomeMessage,
          position: template.position,
          showEmojis: template.showEmojis,
          allowFileUploads: template.allowFileUploads,
          showFaqs: isTemplateFaqsEnabled,
          autoReplySuggestions: templateAutoReplySuggestions,
          suggestedMessages: templateSuggestedMessages,
          departmentSelection: templateDepartmentSelection,
          businessHours: templateBusinessHours,
          widget: {
            name: template.name,
            position: template.position,
            title: template.title,
            subtitle: template.subtitle,
            width: template.width,
            height: template.height,
            textColor: template.textColor,
            backgroundColor: template.backgroundColor,
          },
          preChatForm: template.preChatForm,
        },
        faqItems: isTemplateFaqsEnabled ? templateFaqs : [],
        suggestedMessages: templateSuggestedMessages,
        visitorProfile: {
          name: "",
          email: template.allowedUserEmail || "",
        },
      },
    });
  }

  const workspace = access.workspace;
  const brandSettings = workspace?.brandSettings || {};
  const areFaqsEnabled = brandSettings?.showFaqs !== false;

  const configFaqs = Array.isArray(brandSettings?.faqItems)
    ? brandSettings.faqItems
        .map(sanitizeFaq)
        .filter(
          (faq) =>
            faq.question &&
            faq.answer &&
            String(faq.status || "published").toLowerCase() !== "unpublished",
        )
    : [];

  const fallbackFaqs =
    configFaqs.length > 0
      ? []
      : (
          await FAQ.find({
            status: "published",
            workspaceId: workspace?._id,
          })
            .sort({ createdAt: -1 })
            .limit(50)
        ) // Increased limit for better search experience
          .map(sanitizeFaq);
  const resolvedFaqs = configFaqs.length > 0 ? configFaqs : fallbackFaqs;
  const normalizedSuggestedMessages = normalizeSuggestedMessagesForWidget(
    brandSettings?.suggestedMessages,
    resolvedFaqs,
  );
  const autoReplySuggestions = brandSettings?.autoReplySuggestions !== false;
  const departmentSelection = normalizeDepartmentSelection(
    brandSettings?.departmentSelection,
  );
  const businessHours = normalizeBusinessHours(brandSettings?.businessHours);

  return res.status(200).json({
    data: {
      workspaceId: normalizeId(workspace?._id),
      workspaceName: workspace?.name || "ChatFlex",
      settings: {
        ...(brandSettings || {}),
        showFaqs: areFaqsEnabled,
        autoReplySuggestions,
        suggestedMessages: normalizedSuggestedMessages,
        departmentSelection,
        businessHours,
      },
      faqItems: areFaqsEnabled
        ? resolvedFaqs
        : [],
      suggestedMessages: normalizedSuggestedMessages,
    },
  });
});

export const getWidgetPublicMeta = catchAsyncHandler(async (req, res) => {
  const requestedWorkspaceId = String(req.query.workspaceId || "").trim();
  const workspace = requestedWorkspaceId
    ? await Workspace.findById(requestedWorkspaceId)
    : await getDefaultWorkspace();

  if (!workspace) {
    return res.status(404).json({ message: "Workspace not found" });
  }

  return res.status(200).json({
    data: {
      workspaceId: normalizeId(workspace._id),
      appName: workspace.name || "ChatFlex",
      widgetApiKey: workspace.apiKey,
    },
  });
});

export const createVisitorConversation = catchAsyncHandler(async (req, res) => {
  const {
    apiKey,
    widgetId,
    widgetToken,
    visitorId,
    visitorEmail,
    metadata,
    department,
    forceNewConversation,
  } = req.body;
  const sanitizedMetadata = sanitizeVisitorMetadata(metadata);
  const profileFromMetadata =
    extractVisitorProfileFromMetadata(sanitizedMetadata);
  const normalizedProfileName = normalizeVisitorName(profileFromMetadata.name);
  if (normalizedProfileName && !isValidVisitorName(normalizedProfileName)) {
    return res.status(400).json({
      message: "Invalid visitor profile: name is not valid",
    });
  }

  const normalizedProfilePhone = String(profileFromMetadata.phone || "").trim();
  const normalizedBodyVisitorEmail = String(visitorEmail || "")
    .trim()
    .toLowerCase();
  const normalizedMetadataEmail = String(profileFromMetadata.email || "")
    .trim()
    .toLowerCase();
  const effectiveVisitorEmail = pickFirstNonEmptyString(
    normalizedBodyVisitorEmail,
    normalizedMetadataEmail,
  ).toLowerCase();
  const visitorMetadata = {
    ...sanitizedMetadata,
    ...(normalizedProfileName ? { name: normalizedProfileName } : {}),
    ...(effectiveVisitorEmail ? { email: effectiveVisitorEmail } : {}),
    ...(normalizedProfilePhone ? { phone: normalizedProfilePhone } : {}),
  };

  if (
    normalizedBodyVisitorEmail &&
    normalizedMetadataEmail &&
    normalizedBodyVisitorEmail !== normalizedMetadataEmail
  ) {
    return res.status(400).json({
      message: "Invalid visitor profile: email mismatch",
    });
  }

  const access = await validateWidgetAccess({
    apiKey,
    widgetId,
    widgetToken,
    visitorEmail: effectiveVisitorEmail,
    originHost: resolveOriginHost(req),
  });

  if (access?.denied) {
    return res.status(403).json({ message: access.reason });
  }

  if (!access) {
    return res.status(401).json({ message: "Invalid API key" });
  }

  if (!visitorId || typeof visitorId !== "string") {
    return res.status(400).json({ message: "visitorId is required" });
  }
  const workspaceScope = await buildWorkspaceScopeFromAccess(access);
  const widgetMetadata = buildWidgetMetadata({ access, widgetId });
  const departmentSelectionSettings = resolveDepartmentSelectionSettings(access);
  const selectedDepartment = resolveRequestedDepartment({
    requestedDepartment: department,
    metadata: visitorMetadata,
    selectionSettings: departmentSelectionSettings,
  });
  const trustedVisitorContext = buildTrustedVisitorContext(req, metadata);
  const businessHoursSettings = resolveBusinessHoursSettings(access);
  const outsideBusinessHours = !isWithinBusinessHours(businessHoursSettings);
  const businessHoursAutoReplyEnabled =
    outsideBusinessHours && businessHoursSettings.autoReplyEnabled !== false;
  const scopedVisitorMetadata = {
    ...visitorMetadata,
    ...widgetMetadata,
    ...(selectedDepartment ? { department: selectedDepartment } : {}),
    visitorInfo: trustedVisitorContext,
  };
  const offlineMode =
    (access.mode === "apiKey" &&
      access.workspace?.brandSettings?.offlineMode === true) ||
    outsideBusinessHours;

  const visitorUser = await getOrCreateWidgetVisitorUser({
    visitorId,
    metadata: scopedVisitorMetadata,
    workspaceId: workspaceScope.workspaceId,
  });

  let usage = null;
  if (access.mode === "apiKey") {
    const workspace = access.workspace;
    usage = await getOrCreateWorkspaceUsage(workspace._id);
    const conversationLimit = workspace?.limits?.conversationsPerMonth || 50000;
    if (usage && usage.conversationsThisMonth >= conversationLimit) {
      return res.status(403).json({ message: "Plan limit reached" });
    }
  }

  const shouldForceNewConversation = Boolean(forceNewConversation);
  const scopedConversationQuery = {
    visitorId,
    status: { $in: ["open", "pending"] },
    ...(selectedDepartment ? { department: selectedDepartment } : {}),
    ...workspaceScope,
    ...(widgetMetadata.widgetScopeKey
      ? { "metadata.widgetScopeKey": widgetMetadata.widgetScopeKey }
      : {}),
  };

  if (shouldForceNewConversation) {
    await Conversation.updateMany(scopedConversationQuery, {
      $set: { status: "resolved" },
    });
  }

  const recentConversation = shouldForceNewConversation
    ? null
    : await Conversation.findOne(scopedConversationQuery)
        .populate("assignedTo", "_id")
        .sort({ updatedAt: -1 });

  if (recentConversation) {
    let assignedAgentId = normalizeId(recentConversation.assignedTo?._id);
    const keepCurrentAssignee =
      assignedAgentId &&
      (await isCurrentAssigneeAvailable({
        assigneeId: assignedAgentId,
        workspaceId: workspaceScope.workspaceId,
      }));

    if (!keepCurrentAssignee && !offlineMode && workspaceScope.workspaceId) {
      assignedAgentId = "";
      const fallbackAgent = await pickDefaultAgent({
        workspaceId: workspaceScope.workspaceId,
        department: selectedDepartment,
      });
      if (fallbackAgent) {
        recentConversation.assignedTo = fallbackAgent._id;
        recentConversation.assignedAgent = fallbackAgent._id;
        if (!recentConversation.workspaceId && fallbackAgent.workspaceId) {
          recentConversation.workspaceId = fallbackAgent.workspaceId;
        }
        if (!visitorUser.workspaceId && fallbackAgent.workspaceId) {
          visitorUser.workspaceId = fallbackAgent.workspaceId;
          await visitorUser.save();
        }
        recentConversation.visitorUserId = visitorUser._id; // Ensure it's set
        await recentConversation.save();
        assignedAgentId = normalizeId(fallbackAgent._id);
      }
    } else {
      // No-op here; visitor binding is normalized below for all branches.
    }

    // Keep visitor user binding stable for this browser visitor.
    if (
      normalizeId(recentConversation.visitorUserId) !==
      normalizeId(visitorUser._id)
    ) {
      recentConversation.visitorUserId = visitorUser._id;
    }
    recentConversation.metadata = {
      ...(recentConversation.metadata || {}),
      ...scopedVisitorMetadata,
      businessHoursStatus: outsideBusinessHours ? "outside" : "inside",
    };
    if (selectedDepartment) {
      recentConversation.department = selectedDepartment;
    }

    const autoReplyAlreadySent = Boolean(
      recentConversation?.metadata?.businessHoursAutoReplySentAt,
    );
    if (businessHoursAutoReplyEnabled && !autoReplyAlreadySent) {
      await Message.create({
        conversationId: recentConversation._id,
        workspaceId:
          recentConversation.workspaceId || workspaceScope.workspaceId || undefined,
        senderType: "agent",
        senderId: recentConversation.assignedTo || recentConversation.assignedAgent || undefined,
        receiverId: visitorUser._id,
        content: getBusinessHoursAutoReplyMessage(businessHoursSettings),
      });
      recentConversation.metadata.businessHoursAutoReplySentAt =
        new Date().toISOString();
      recentConversation.lastMessageAt = new Date();
    }

    await recentConversation.save();

    const socketToken = createWidgetSocketToken(visitorUser);
    return res.status(200).json({
      data: {
        conversationId: normalizeId(recentConversation._id),
        visitorId: recentConversation.visitorId,
        visitorUserId: normalizeId(visitorUser._id),
        socketToken,
        assignedAgentId,
        status: recentConversation.status,
        workspaceId: normalizeId(recentConversation.workspaceId),
        department: String(recentConversation.department || selectedDepartment || ""),
      },
    });
  }

  const conversation = await Conversation.create({
    visitorId,
    visitorUserId: visitorUser._id,
    ...(selectedDepartment ? { department: selectedDepartment } : {}),
    ...workspaceScope,
    metadata: {
      ...scopedVisitorMetadata,
      businessHoursStatus: outsideBusinessHours ? "outside" : "inside",
    },
    ...(offlineMode ? { status: "pending" } : {}),
  });

  const assignedAgent =
    !offlineMode && workspaceScope.workspaceId
      ? await pickDefaultAgent({
          workspaceId: workspaceScope.workspaceId,
          department: selectedDepartment,
        })
      : null;
  if (assignedAgent) {
    conversation.assignedTo = assignedAgent._id;
    conversation.assignedAgent = assignedAgent._id;
    if (!conversation.workspaceId && assignedAgent.workspaceId) {
      conversation.workspaceId = assignedAgent.workspaceId;
    }
    if (!visitorUser.workspaceId && assignedAgent.workspaceId) {
      visitorUser.workspaceId = assignedAgent.workspaceId;
      await visitorUser.save();
    }
    await conversation.save();
  }

  if (businessHoursAutoReplyEnabled) {
    await Message.create({
      conversationId: conversation._id,
      workspaceId: conversation.workspaceId || workspaceScope.workspaceId || undefined,
      senderType: "agent",
      senderId: conversation.assignedTo || conversation.assignedAgent || undefined,
      receiverId: visitorUser._id,
      content: getBusinessHoursAutoReplyMessage(businessHoursSettings),
    });
    conversation.metadata = {
      ...(conversation.metadata || {}),
      businessHoursAutoReplySentAt: new Date().toISOString(),
    };
    conversation.lastMessageAt = new Date();
    await conversation.save();
  }

  const workspaceId = normalizeId(conversation.workspaceId);
  if (workspaceId) {
    await executeAutomationRules({
      workspaceId,
      trigger: "conversation_created",
      conversation,
      senderType: "visitor",
      actorId: normalizeId(visitorUser?._id),
    });

    await dispatchIntegrationEvent({
      workspaceId,
      event: "conversation_created",
      payload: {
        conversationId: normalizeId(conversation._id),
        status: String(conversation.status || ""),
        department: String(conversation.department || ""),
        source: "widget",
      },
    });
  }

  if (usage) {
    usage.conversationsThisMonth += 1;
    await usage.save();
  }

  return res.status(201).json({
    data: {
      conversationId: normalizeId(conversation._id),
      visitorId: conversation.visitorId,
      visitorUserId: normalizeId(visitorUser._id),
      socketToken: createWidgetSocketToken(visitorUser),
      assignedAgentId: normalizeId(assignedAgent?._id),
      status: conversation.status,
      workspaceId: normalizeId(conversation.workspaceId),
      department: String(conversation.department || selectedDepartment || ""),
    },
  });
});

export const getVisitorConversationMessages = catchAsyncHandler(
  async (req, res) => {
    const { conversationId } = req.params;
    const apiKey = req.query.apiKey || req.body?.apiKey;
    const widgetId = req.query.widgetId || req.body?.widgetId;
    const widgetToken = req.query.widgetToken || req.body?.widgetToken;
    const visitorEmail = req.query.visitorEmail || req.body?.visitorEmail;
    const after = req.query.after;
    const limit = Math.min(Number(req.query.limit) || 50, 100);

    const access = await validateWidgetAccess({
      apiKey,
      widgetId,
      widgetToken,
      visitorEmail,
      originHost: resolveOriginHost(req),
    });
    if (access?.denied) {
      return res.status(403).json({ message: access.reason });
    }
    if (!access) {
      return res.status(401).json({ message: "Invalid API key" });
    }
    const workspaceScope = await buildWorkspaceScopeFromAccess(access);

    const conversation = await Conversation.findOne({
      _id: conversationId,
      ...workspaceScope,
    });

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    const query = {
      conversationId: conversation._id,
      ...workspaceScope,
    };

    const afterDate = parseAfterDate(after);
    if (afterDate) query.createdAt = { $gt: afterDate };

    const messages = await Message.find(query)
      .sort({ createdAt: 1 })
      .limit(limit);

    return res.status(200).json({
      data: messages.map(sanitizeMessage),
    });
  },
);

export const postVisitorMessage = catchAsyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const {
    apiKey,
    widgetId,
    widgetToken,
    visitorId,
    content,
    visitorEmail,
    attachments,
  } = req.body;

  const access = await validateWidgetAccess({
    apiKey,
    widgetId,
    widgetToken,
    visitorEmail,
    originHost: resolveOriginHost(req),
  });
  if (access?.denied) {
    return res.status(403).json({ message: access.reason });
  }
  if (!access) {
    return res.status(401).json({ message: "Invalid API key" });
  }
  const workspaceScope = await buildWorkspaceScopeFromAccess(access);
  const businessHoursSettings = resolveBusinessHoursSettings(access);
  const outsideBusinessHours = !isWithinBusinessHours(businessHoursSettings);
  const businessHoursAutoReplyEnabled =
    outsideBusinessHours && businessHoursSettings.autoReplyEnabled !== false;

  if (!visitorId || typeof visitorId !== "string") {
    return res.status(400).json({ message: "visitorId is required" });
  }

  const trimmedContent = String(content || "").trim();
  const detectedLanguage = detectMessageLanguage(trimmedContent);
  const normalizedAttachments = sanitizeAttachments(attachments);
  if (!trimmedContent && normalizedAttachments.length === 0) {
    return res.status(400).json({ message: "Message content is required" });
  }

  const conversation = await Conversation.findOne({
    _id: conversationId,
    ...workspaceScope,
  });

  if (!conversation) {
    return res.status(404).json({ message: "Conversation not found" });
  }

  if (conversation.visitorId !== visitorId) {
    return res.status(403).json({ message: "Visitor mismatch" });
  }

  if (
    !conversation.assignedAgent &&
    !conversation.assignedTo &&
    (normalizeId(conversation.workspaceId) ||
      normalizeId(workspaceScope.workspaceId))
  ) {
    const fallbackAgent = await pickDefaultAgent({
      workspaceId:
        normalizeId(conversation.workspaceId) ||
        normalizeId(workspaceScope.workspaceId),
      department: conversation.department || conversation?.metadata?.department,
    });
    if (fallbackAgent) {
      conversation.assignedTo = fallbackAgent._id;
      conversation.assignedAgent = fallbackAgent._id;
      if (!conversation.workspaceId && fallbackAgent.workspaceId) {
        conversation.workspaceId = fallbackAgent.workspaceId;
      }
    }
  }

  const fallbackContent =
    normalizedAttachments.length > 1
      ? `[Files: ${normalizedAttachments.length}]`
      : normalizedAttachments.length === 1
        ? `[File: ${normalizedAttachments[0]?.name || "Attachment"}]`
        : "";

  const message = await Message.create({
    conversationId: conversation._id,
    workspaceId:
      conversation.workspaceId || workspaceScope.workspaceId || undefined,
    senderType: "visitor",
    senderId: conversation.visitorUserId || undefined,
    receiverId:
      conversation.assignedAgent || conversation.assignedTo || undefined,
    content: trimmedContent || fallbackContent,
    attachments: normalizedAttachments,
  });

  conversation.lastMessageAt = new Date();
  conversation.metadata = {
    ...(conversation.metadata || {}),
    visitorInfo: {
      ...((conversation.metadata || {}).visitorInfo || {}),
      language: detectedLanguage,
      lastMessageAt: new Date().toISOString(),
    },
    businessHoursStatus: outsideBusinessHours ? "outside" : "inside",
  };
  if (conversation.status === "resolved") {
    conversation.status = "open";
  }
  if (
    businessHoursAutoReplyEnabled &&
    !conversation?.metadata?.businessHoursAutoReplySentAt
  ) {
    await Message.create({
      conversationId: conversation._id,
      workspaceId: conversation.workspaceId || workspaceScope.workspaceId || undefined,
      senderType: "agent",
      senderId: conversation.assignedTo || conversation.assignedAgent || undefined,
      receiverId: conversation.visitorUserId || undefined,
      content: getBusinessHoursAutoReplyMessage(businessHoursSettings),
    });
    conversation.metadata.businessHoursAutoReplySentAt =
      new Date().toISOString();
  }
  await conversation.save();
  await emitWidgetMessageRealtime({
    io: getSocketIo(req),
    message,
    conversation,
    senderName:
      String(conversation?.metadata?.name || "").trim() || "Website Visitor",
  });

  const workspaceId = normalizeId(
    conversation.workspaceId || workspaceScope.workspaceId,
  );
  if (workspaceId) {
    await executeAutomationRules({
      workspaceId,
      trigger: "visitor_message",
      conversation,
      message,
      senderType: "visitor",
      actorId: normalizeId(conversation.visitorUserId),
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
        source: "widget",
      },
    });
  }

  return res.status(201).json({
    data: sanitizeMessage(message),
  });
});

export const updateVisitorMessage = catchAsyncHandler(async (req, res) => {
  const { conversationId, messageId } = req.params;
  const {
    apiKey,
    widgetId,
    widgetToken,
    visitorId,
    visitorEmail,
    content,
    attachments,
  } = req.body || {};

  const access = await validateWidgetAccess({
    apiKey,
    widgetId,
    widgetToken,
    visitorEmail,
    originHost: resolveOriginHost(req),
  });
  if (access?.denied) {
    return res.status(403).json({ message: access.reason });
  }
  if (!access) {
    return res.status(401).json({ message: "Invalid API key" });
  }
  const workspaceScope = await buildWorkspaceScopeFromAccess(access);
  if (!visitorId || typeof visitorId !== "string") {
    return res.status(400).json({ message: "visitorId is required" });
  }

  const trimmedContent = String(content || "").trim();
  const normalizedAttachments = sanitizeAttachments(attachments);
  if (!trimmedContent && normalizedAttachments.length === 0) {
    return res.status(400).json({ message: "Message content is required" });
  }

  const conversation = await Conversation.findOne({
    _id: conversationId,
    ...workspaceScope,
  });
  if (!conversation) {
    return res.status(404).json({ message: "Conversation not found" });
  }
  if (conversation.visitorId !== visitorId) {
    return res.status(403).json({ message: "Visitor mismatch" });
  }

  const message = await Message.findOne({
    _id: messageId,
    ...workspaceScope,
  });
  if (!message) {
    return res.status(404).json({ message: "Message not found" });
  }
  if (String(message.conversationId || "") !== String(conversation._id)) {
    return res
      .status(403)
      .json({ message: "Message does not belong to this conversation" });
  }
  if (message.senderType !== "visitor") {
    return res
      .status(403)
      .json({ message: "Only visitor messages can be edited" });
  }

  message.content = trimmedContent;
  await message.save();
  emitMessageMutationRealtime({
    io: getSocketIo(req),
    message,
    type: "updated",
  });

  return res.status(200).json({ data: sanitizeMessage(message) });
});

export const deleteVisitorMessage = catchAsyncHandler(async (req, res) => {
  const { conversationId, messageId } = req.params;
  const { apiKey, widgetId, widgetToken, visitorId, visitorEmail } =
    req.body || {};

  const access = await validateWidgetAccess({
    apiKey,
    widgetId,
    widgetToken,
    visitorEmail,
    originHost: resolveOriginHost(req),
  });
  if (access?.denied) {
    return res.status(403).json({ message: access.reason });
  }
  if (!access) {
    return res.status(401).json({ message: "Invalid API key" });
  }
  const workspaceScope = await buildWorkspaceScopeFromAccess(access);
  if (!visitorId || typeof visitorId !== "string") {
    return res.status(400).json({ message: "visitorId is required" });
  }

  const conversation = await Conversation.findOne({
    _id: conversationId,
    ...workspaceScope,
  });
  if (!conversation) {
    return res.status(404).json({ message: "Conversation not found" });
  }
  if (conversation.visitorId !== visitorId) {
    return res.status(403).json({ message: "Visitor mismatch" });
  }

  const message = await Message.findOne({
    _id: messageId,
    ...workspaceScope,
  });
  if (!message) {
    return res.status(404).json({ message: "Message not found" });
  }
  if (String(message.conversationId || "") !== String(conversation._id)) {
    return res
      .status(403)
      .json({ message: "Message does not belong to this conversation" });
  }
  if (message.senderType !== "visitor") {
    return res
      .status(403)
      .json({ message: "Only visitor messages can be deleted" });
  }

  await Message.deleteOne({ _id: messageId });
  emitMessageMutationRealtime({
    io: getSocketIo(req),
    message,
    type: "deleted",
    messageId,
  });
  return res.status(200).json({
    message: "Message deleted successfully",
    data: { messageId: normalizeId(messageId) },
  });
});

export const getVisitorDirectMessages = catchAsyncHandler(async (req, res) => {
  const apiKey = req.query.apiKey || req.body?.apiKey;
  const widgetId = req.query.widgetId || req.body?.widgetId;
  const widgetToken = req.query.widgetToken || req.body?.widgetToken;
  const visitorId = req.query.visitorId || req.body?.visitorId;
  const visitorEmail = req.query.visitorEmail || req.body?.visitorEmail;
  const after = req.query.after;
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const conversationId = String(req.query.conversationId || "").trim();

  const access = await validateWidgetAccess({
    apiKey,
    widgetId,
    widgetToken,
    visitorEmail,
    originHost: resolveOriginHost(req),
  });
  if (access?.denied) {
    return res.status(403).json({ message: access.reason });
  }
  if (!access) {
    return res.status(401).json({ message: "Invalid API key" });
  }
  const workspaceScope = await buildWorkspaceScopeFromAccess(access);

  if (!visitorId || typeof visitorId !== "string") {
    return res.status(400).json({ message: "visitorId is required" });
  }

  const visitorUser = await findWidgetVisitorUser({
    visitorId,
    workspaceId: workspaceScope.workspaceId,
  });

  if (!visitorUser) {
    return res.status(200).json({ data: [] });
  }

  const query = {
    $or: [{ senderId: visitorUser._id }, { receiverId: visitorUser._id }],
    ...workspaceScope,
  };

  if (conversationId) {
    const conversation = await Conversation.findOne({
      _id: conversationId,
      visitorId,
      ...workspaceScope,
    }).select("_id");
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }
    query.conversationId = conversation._id;
  }

  const afterDate = parseAfterDate(after);
  if (afterDate) query.createdAt = { $gt: afterDate };

  const messages = await Message.find(query)
    .sort({ createdAt: 1 })
    .limit(limit)
    .populate("senderId", "name");

  return res.status(200).json({
    data: messages.map((msg) => ({
      _id: normalizeId(msg._id),
      senderId: normalizeId(msg.senderId?._id || msg.senderId),
      senderName: msg.senderId?.name || "Agent",
      receiverId: normalizeId(msg.receiverId),
      conversationId: normalizeId(msg.conversationId),
      content: msg.content,
      attachments: sanitizeAttachments(msg.attachments),
      senderType: msg.senderType,
      createdAt: msg.createdAt,
    })),
  });
});

export const leaveVisitorConversation = catchAsyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { apiKey, widgetId, widgetToken, visitorId, visitorEmail } = req.body;

  const access = await validateWidgetAccess({
    apiKey,
    widgetId,
    widgetToken,
    visitorEmail,
    originHost: resolveOriginHost(req),
  });
  if (access?.denied) {
    return res.status(403).json({ message: access.reason });
  }
  if (!access) {
    return res.status(401).json({ message: "Invalid API key" });
  }
  const workspaceScope = await buildWorkspaceScopeFromAccess(access);

  if (!visitorId || typeof visitorId !== "string") {
    return res.status(400).json({ message: "visitorId is required" });
  }

  const conversation = await Conversation.findOne({
    _id: conversationId,
    ...workspaceScope,
  });

  if (!conversation) {
    return res.status(404).json({ message: "Conversation not found" });
  }

  if (conversation.visitorId !== visitorId) {
    return res.status(403).json({ message: "Visitor mismatch" });
  }

  // Leaving chat from widget should NOT count as "resolved".
  // Keep it pending so accidental leaves/disconnect-like exits do not inflate
  // resolved analytics. Agents can explicitly resolve from inbox when done.
  if (conversation.status !== "resolved") {
    conversation.status = "pending";
  }
  conversation.metadata = {
    ...(conversation.metadata || {}),
    visitorLeftChatAt: new Date().toISOString(),
    visitorLeftChat: true,
  };
  await conversation.save();

  return res.status(200).json({
    message: "Conversation left successfully",
    data: {
      conversationId: normalizeId(conversation._id),
      status: conversation.status,
    },
  });
});

export const updateVisitorProfile = catchAsyncHandler(async (req, res) => {
  const { apiKey, widgetId, widgetToken, visitorId, visitorEmail, metadata } =
    req.body;
  const sanitizedMetadata = sanitizeVisitorMetadata(metadata);
  const profile = extractVisitorProfileFromMetadata(sanitizedMetadata);
  const normalizedProfileName = normalizeVisitorName(profile.name);
  if (normalizedProfileName && !isValidVisitorName(normalizedProfileName)) {
    return res.status(400).json({
      message: "Invalid visitor profile: name is not valid",
    });
  }

  const normalizedProfilePhone = String(profile.phone || "").trim();
  const normalizedBodyVisitorEmail = String(visitorEmail || "")
    .trim()
    .toLowerCase();
  const normalizedProfileEmail = String(profile.email || "")
    .trim()
    .toLowerCase();
  const effectiveVisitorEmail = pickFirstNonEmptyString(
    normalizedBodyVisitorEmail,
    normalizedProfileEmail,
  ).toLowerCase();
  const profileMetadata = {
    ...sanitizedMetadata,
    ...(normalizedProfileName ? { name: normalizedProfileName } : {}),
    ...(effectiveVisitorEmail ? { email: effectiveVisitorEmail } : {}),
    ...(normalizedProfilePhone ? { phone: normalizedProfilePhone } : {}),
  };

  if (
    normalizedBodyVisitorEmail &&
    normalizedProfileEmail &&
    normalizedBodyVisitorEmail !== normalizedProfileEmail
  ) {
    return res.status(400).json({
      message: "Invalid visitor profile: email mismatch",
    });
  }

  const access = await validateWidgetAccess({
    apiKey,
    widgetId,
    widgetToken,
    visitorEmail: effectiveVisitorEmail,
    originHost: resolveOriginHost(req),
  });

  if (access?.denied) {
    return res.status(403).json({ message: access.reason });
  }
  if (!access) {
    return res.status(401).json({ message: "Invalid API key" });
  }
  const workspaceScope = await buildWorkspaceScopeFromAccess(access);
  const widgetMetadata = buildWidgetMetadata({ access, widgetId });
  const departmentSelectionSettings = resolveDepartmentSelectionSettings(access);
  const selectedDepartment = resolveRequestedDepartment({
    requestedDepartment: req.body?.department,
    metadata: profileMetadata,
    selectionSettings: departmentSelectionSettings,
  });
  const trustedVisitorContext = buildTrustedVisitorContext(req, metadata);
  const scopedProfileMetadata = {
    ...profileMetadata,
    ...widgetMetadata,
    ...(selectedDepartment ? { department: selectedDepartment } : {}),
    visitorInfo: trustedVisitorContext,
  };

  if (!visitorId || typeof visitorId !== "string") {
    return res.status(400).json({ message: "visitorId is required" });
  }

  // Upsert-like behavior for widget visitors:
  // ensures visitor record exists and profile email/name are persisted.
  const visitorUser = await getOrCreateWidgetVisitorUser({
    visitorId,
    metadata: scopedProfileMetadata,
    workspaceId: workspaceScope.workspaceId,
  });

  // Also update latest conversation metadata so agent session picks it up
  const activeConversation = await Conversation.findOne({
    visitorId,
    ...workspaceScope,
    ...(widgetMetadata.widgetScopeKey
      ? { "metadata.widgetScopeKey": widgetMetadata.widgetScopeKey }
      : {}),
  }).sort({ updatedAt: -1 });

  if (activeConversation) {
    activeConversation.metadata = {
      ...(activeConversation.metadata || {}),
      ...scopedProfileMetadata,
    };
    if (selectedDepartment) {
      activeConversation.department = selectedDepartment;
    }
    await activeConversation.save();
  }

  return res.status(200).json({
    message: "Visitor profile updated successfully",
    data: {
      visitorId,
      visitorUserId: normalizeId(visitorUser._id),
      name: visitorUser.name,
      metadata: activeConversation?.metadata || scopedProfileMetadata,
    },
  });
});
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads/";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname),
    );
  },
});

export const upload = multer({
  storage: storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
});

export const uploadVisitorFile = catchAsyncHandler(async (req, res) => {
  const { apiKey, widgetId, widgetToken, visitorId, visitorEmail } = req.body;

  const access = await validateWidgetAccess({
    apiKey,
    widgetId,
    widgetToken,
    visitorEmail,
    originHost: resolveOriginHost(req),
  });

  if (access?.denied) {
    return res.status(403).json({ message: access.reason });
  }
  if (!access) {
    return res.status(401).json({ message: "Invalid API key" });
  }

  const uploadsAllowed =
    access.mode === "template"
      ? access.template?.allowFileUploads !== false
      : access.workspace?.brandSettings?.allowFileUploads !== false;
  if (!uploadsAllowed) {
    return res.status(403).json({ message: "File uploads are disabled" });
  }

  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;

  return res.status(200).json({
    message: "File uploaded successfully",
    data: {
      url: fileUrl,
      name: req.file.originalname,
      type: req.file.mimetype,
      size: req.file.size,
    },
  });
});
