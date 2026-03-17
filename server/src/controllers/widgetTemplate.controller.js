import { Conversation, WidgetTemplate } from "../models/index.js";
import { catchAsyncHandler } from "../middleware/error.middleware.js";
import crypto from "crypto";
import ejs from "ejs";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import multer from "multer";
import { resolveWorkspaceId } from "../utils/workspace.utils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const templatesDir = path.join(__dirname, "../templates");
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PRECHAT_FIELD_TYPES = new Set(["text", "email", "number", "textarea"]);
const WIDGET_METADATA_SYSTEM_KEYS = new Set([
  "widgetMode",
  "widgetScopeKey",
  "widgetTemplateId",
  "widgetTemplateName",
  "businessHoursStatus",
  "businessHoursAutoReplySentAt",
  "visitorInfo",
  "department",
]);

const isValidEmail = (value) =>
  EMAIL_REGEX.test(
    String(value || "")
      .trim()
      .toLowerCase(),
  );

const hasRequiredEmailField = (fields = []) =>
  (Array.isArray(fields) ? fields : []).some((field) => {
    const type = String(field?.type || "")
      .trim()
      .toLowerCase();
    const label = String(field?.label || "")
      .trim()
      .toLowerCase();
    const isEmailField = type === "email" || label.includes("email");
    return isEmailField && field?.required !== false;
  });

const validateAllowedEmailFormConfig = ({ allowedUserEmail, preChatForm }) => {
  const allowedEmail = String(allowedUserEmail || "")
    .trim()
    .toLowerCase();
  if (!allowedEmail) return null;
  if (!preChatForm?.enabled) {
    return "Enable pre-chat form when Allowed User Email is set";
  }
  if (!hasRequiredEmailField(preChatForm.fields)) {
    return "Pre-chat form must include a required email field when Allowed User Email is set";
  }
  return null;
};

const normalizeFaqItems = (faqItems) => {
  if (!Array.isArray(faqItems)) return [];
  return faqItems
    .map((item) => ({
      question: String(item?.question || "").trim(),
      answer: String(item?.answer || "").trim(),
      category: String(item?.category || "General").trim() || "General",
      status:
        String(item?.status || "published").toLowerCase() === "unpublished"
          ? "unpublished"
          : "published",
    }))
    .filter((item) => item.question && item.answer);
};

const normalizeSuggestedMessages = (suggestedMessages, faqItems = []) => {
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
          answer: faqAnswerByQuestion.get(message.toLowerCase()) || "",
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
        "";

      return { message, answer };
    })
    .filter(Boolean);
};

const normalizePreChatForm = (value) => {
  const source = value && typeof value === "object" ? value : {};
  const enabled = Boolean(source.enabled);

  const fields = Array.isArray(source.fields)
    ? source.fields
        .map((field) => {
          const label = String(field?.label || "").trim();
          const type = String(field?.type || "text").toLowerCase();
          if (!label) return null;
          if (!PRECHAT_FIELD_TYPES.has(type)) return null;
          return {
            label,
            type,
            required: field?.required !== false,
            placeholder: String(field?.placeholder || "").trim(),
          };
        })
        .filter(Boolean)
    : [];

  if (enabled && fields.length === 0) {
    return {
      error: "Pre-chat form must include at least one valid field when enabled",
    };
  }

  return { enabled, fields };
};

const normalizeDepartmentOption = (item, index) => {
  const key = String(item?.key || item?.value || item?.label || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
  const label =
    String(item?.label || item?.name || "").trim() ||
    (key ? key.replace(/-/g, " ") : "");
  if (!key || !label) return null;
  return {
    key,
    label,
    isDefault: item?.isDefault === true || index === 0,
  };
};

const normalizeDepartmentSelection = (value = {}) => {
  const source = value && typeof value === "object" ? value : {};
  const options = Array.isArray(source.options)
    ? source.options.map(normalizeDepartmentOption).filter(Boolean)
    : [];

  const fallbackOptions =
    options.length > 0
      ? options
      : [
          { key: "sales", label: "Sales", isDefault: true },
          { key: "support", label: "Support", isDefault: false },
        ];

  return {
    enabled: source.enabled === true,
    options: fallbackOptions,
  };
};

const normalizeBusinessHours = (value = {}) => {
  const source = value && typeof value === "object" ? value : {};
  const weekdays = Array.isArray(source.weekdays)
    ? Array.from(
        new Set(
          source.weekdays
            .map((item) => Number(item))
            .filter((item) => Number.isInteger(item) && item >= 0 && item <= 6),
        ),
      ).sort((a, b) => a - b)
    : [1, 2, 3, 4, 5];

  return {
    enabled: source.enabled === true,
    timezone: String(source.timezone || "UTC").trim() || "UTC",
    weekdays: weekdays.length > 0 ? weekdays : [1, 2, 3, 4, 5],
    startTime: String(source.startTime || "09:00").trim() || "09:00",
    endTime: String(source.endTime || "18:00").trim() || "18:00",
    autoReplyEnabled: source.autoReplyEnabled !== false,
    autoReplyMessage:
      String(source.autoReplyMessage || "").trim() ||
      "Thanks for reaching out. Our team is currently offline, but we have received your message and will reply in business hours.",
  };
};

const toSnakeCase = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const toDisplayValue = (value) => {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value
      .map((entry) => toDisplayValue(entry))
      .filter(Boolean)
      .join(", ");
  }
  if (value && typeof value === "object") {
    return "";
  }
  return "";
};

const escapeRegex = (value) =>
  String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const extractPreChatFieldEntries = (metadata = {}, fields = []) => {
  const source = metadata && typeof metadata === "object" ? metadata : {};
  const normalizedFields = Array.isArray(fields) ? fields : [];
  const usedKeys = new Set();
  const entries = [];

  normalizedFields.forEach((field) => {
    const label = String(field?.label || "").trim();
    if (!label) return;
    const snake = toSnakeCase(label);
    const candidates = [label, snake];

    let value = "";
    for (const candidate of candidates) {
      const nextValue = toDisplayValue(source[candidate]);
      if (nextValue) {
        value = nextValue;
        usedKeys.add(candidate);
        break;
      }
    }

    if (!value) return;
    entries.push({
      label,
      key: snake || toSnakeCase(label),
      value,
    });
  });

  if (entries.length > 0) return entries;

  Object.keys(source).forEach((key) => {
    if (WIDGET_METADATA_SYSTEM_KEYS.has(key)) return;
    if (usedKeys.has(key)) return;
    const value = toDisplayValue(source[key]);
    if (!value) return;
    entries.push({
      label: key.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      key: toSnakeCase(key),
      value,
    });
  });

  return entries.slice(0, 30);
};

const getActorContext = (req) => {
  const role = String(req.user?.role || "").toLowerCase();
  const isSuperAdmin = role === "super-admin";
  const workspaceId = resolveWorkspaceId(req.user?.workspaceId);
  return { role, isSuperAdmin, workspaceId };
};

const getWorkspaceScope = (req, ctx) => {
  if (ctx.isSuperAdmin) {
    const requestedWorkspaceId = resolveWorkspaceId(
      req.query?.workspaceId || req.body?.workspaceId,
    );
    return requestedWorkspaceId || "";
  }
  return ctx.workspaceId;
};

const buildScopedTemplateQuery = (req, ctx, id = "") => {
  const query = {};
  if (id) query._id = id;

  const workspaceScope = getWorkspaceScope(req, ctx);
  if (!ctx.isSuperAdmin) {
    query.$or = [
      { workspaceId: workspaceScope },
      { workspaceId: null, createdBy: req.user?._id },
    ];
  } else if (workspaceScope) {
    query.workspaceId = workspaceScope;
  }

  return query;
};

export const getWidgetTemplates = catchAsyncHandler(async (req, res) => {
  const ctx = getActorContext(req);

  if (!ctx.isSuperAdmin && !ctx.workspaceId) {
    return res.status(400).json({ message: "Workspace is required" });
  }

  const query = buildScopedTemplateQuery(req, ctx);
  const templates = await WidgetTemplate.find(query)
    .sort({ createdAt: -1 })
    .select("-__v -accessToken");

  if (!templates || templates.length === 0) {
    return res.status(200).json({
      message: "No widget templates found",
      data: [],
    });
  }

  return res.status(200).json({
    message: "Widget templates fetched successfully",
    data: templates,
  });
});

export const getWidgetTemplateFormSubmissions = catchAsyncHandler(
  async (req, res) => {
    const ctx = getActorContext(req);
    if (!ctx.isSuperAdmin && !ctx.workspaceId) {
      return res.status(400).json({ message: "Workspace is required" });
    }

    const { id } = req.params;
    const query = buildScopedTemplateQuery(req, ctx, id);
    const template = await WidgetTemplate.findOne(query).select(
      "_id workspaceId preChatForm name createdBy",
    );
    if (!template) {
      return res.status(404).json({ message: "Widget template not found" });
    }

    const statusFilter = String(req.query?.status || "")
      .trim()
      .toLowerCase();
    const searchText = String(req.query?.q || req.query?.query || "").trim();
    const page = Math.max(1, Number(req.query?.page) || 1);
    const limit = Math.max(1, Math.min(Number(req.query?.limit) || 25, 100));
    const skip = (page - 1) * limit;

    const scopeQuery = {
      ...(template.workspaceId ? { workspaceId: template.workspaceId } : {}),
    };

    const templateSelector = {
      $or: [
        { "metadata.widgetTemplateId": String(template._id) },
        { "metadata.widgetScopeKey": `template:${String(template._id)}` },
      ],
    };

    const conversationQuery = {
      ...scopeQuery,
      ...(statusFilter ? { status: statusFilter } : {}),
      ...templateSelector,
    };

    if (searchText) {
      const searchPattern = new RegExp(escapeRegex(searchText), "i");
      conversationQuery.$and = [
        templateSelector,
        {
          $or: [
            { visitorId: searchPattern },
            { "metadata.name": searchPattern },
            { "metadata.email": searchPattern },
            { "metadata.phone": searchPattern },
            { "metadata.visitorInfo.pageUrl": searchPattern },
          ],
        },
      ];
      delete conversationQuery.$or;
    }

    const [items, total] = await Promise.all([
      Conversation.find(conversationQuery)
        .select("visitorId status department metadata createdAt updatedAt lastMessageAt")
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Conversation.countDocuments(conversationQuery),
    ]);

    const fields = Array.isArray(template?.preChatForm?.fields)
      ? template.preChatForm.fields
      : [];

    const submissions = items.map((conversation) => {
      const metadata =
        conversation?.metadata && typeof conversation.metadata === "object"
          ? conversation.metadata
          : {};
      const visitorInfo =
        metadata?.visitorInfo && typeof metadata.visitorInfo === "object"
          ? metadata.visitorInfo
          : {};
      const preChatFields = extractPreChatFieldEntries(metadata, fields);

      return {
        conversationId: String(conversation._id || ""),
        visitorId: String(conversation.visitorId || ""),
        status: String(conversation.status || ""),
        department: String(conversation.department || metadata.department || ""),
        createdAt: conversation.createdAt || null,
        updatedAt: conversation.updatedAt || null,
        lastMessageAt: conversation.lastMessageAt || null,
        visitor: {
          name: String(metadata.name || "").trim(),
          email: String(metadata.email || "").trim(),
          phone: String(metadata.phone || "").trim(),
          ip: String(visitorInfo.ip || "").trim(),
          country: String(visitorInfo.country || "").trim(),
          pageUrl: String(visitorInfo.pageUrl || "").trim(),
          language: String(visitorInfo.language || metadata.language || "").trim(),
        },
        preChatFields,
      };
    });

    return res.status(200).json({
      data: submissions,
      meta: {
        widgetTemplateId: String(template._id),
        widgetTemplateName: String(template.name || ""),
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  },
);

export const createWidgetTemplate = catchAsyncHandler(async (req, res) => {
  const ctx = getActorContext(req);
  const workspaceScope = getWorkspaceScope(req, ctx);

  if (!ctx.isSuperAdmin && !workspaceScope) {
    return res.status(400).json({ message: "Workspace is required" });
  }

  const {
    name,
    brandColor,
    position,
    title,
    subtitle,
    welcomeMessage,
    logoUrl,
    width,
    height,
    textColor,
    backgroundColor,
    suggestedMessages,
    autoReplySuggestions,
    faqItems,
    showFaqs,
    showEmojis,
    allowFileUploads,
    isLogged,
    allowedUserEmail,
    preChatForm,
    departmentSelection,
    businessHours,
  } = req.body;

  if (!name || !String(name).trim()) {
    return res.status(400).json({ message: "Widget name is required" });
  }
  const normalizedAllowedUserEmail = String(allowedUserEmail || "")
    .trim()
    .toLowerCase();
  if (normalizedAllowedUserEmail && !isValidEmail(normalizedAllowedUserEmail)) {
    return res.status(400).json({ message: "Allowed user email is invalid" });
  }

  const normalizedPreChatForm = normalizePreChatForm(preChatForm);
  if (normalizedPreChatForm.error) {
    return res.status(400).json({ message: normalizedPreChatForm.error });
  }
  const normalizedDepartmentSelection =
    normalizeDepartmentSelection(departmentSelection);
  const normalizedBusinessHours = normalizeBusinessHours(businessHours);
  const allowedEmailConfigError = validateAllowedEmailFormConfig({
    allowedUserEmail: normalizedAllowedUserEmail,
    preChatForm: normalizedPreChatForm,
  });
  if (allowedEmailConfigError) {
    return res.status(400).json({ message: allowedEmailConfigError });
  }

  const normalizedFaqItems = normalizeFaqItems(faqItems);
  const normalizedSuggestedMessages = normalizeSuggestedMessages(
    suggestedMessages,
    normalizedFaqItems,
  );

  const template = await WidgetTemplate.create({
    name: String(name).trim(),
    brandColor,
    position,
    title,
    subtitle,
    welcomeMessage,
    logoUrl,
    width,
    height,
    textColor,
    backgroundColor,
    autoReplySuggestions: autoReplySuggestions !== false,
    suggestedMessages: normalizedSuggestedMessages,
    faqItems: normalizedFaqItems,
    showFaqs: showFaqs !== false,
    showEmojis: showEmojis ?? true,
    allowFileUploads: allowFileUploads ?? true,
    isLogged: Boolean(isLogged),
    preChatForm: normalizedPreChatForm,
    departmentSelection: normalizedDepartmentSelection,
    businessHours: normalizedBusinessHours,
    allowedUserEmail: normalizedAllowedUserEmail,
    createdBy: req.user?._id,
    workspaceId: workspaceScope || null,
  });

  return res.status(201).json({
    message: "Widget template created successfully",
    data: {
      _id: template._id,
      name: template.name,
      brandColor: template.brandColor,
      position: template.position,
      title: template.title,
      subtitle: template.subtitle,
      welcomeMessage: template.welcomeMessage,
      logoUrl: template.logoUrl,
      width: template.width,
      height: template.height,
      textColor: template.textColor,
      backgroundColor: template.backgroundColor,
      autoReplySuggestions: template.autoReplySuggestions,
      suggestedMessages: template.suggestedMessages,
      faqItems: template.faqItems,
      showFaqs: template.showFaqs,
      showEmojis: template.showEmojis,
      allowFileUploads: template.allowFileUploads,
      isLogged: template.isLogged,
      preChatForm: template.preChatForm,
      departmentSelection: template.departmentSelection,
      businessHours: template.businessHours,
      allowedUserEmail: template.allowedUserEmail,
      createdBy: template.createdBy,
      workspaceId: template.workspaceId || null,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    },
  });
});

export const updateWidgetTemplateById = catchAsyncHandler(async (req, res) => {
  const ctx = getActorContext(req);
  if (!ctx.isSuperAdmin && !ctx.workspaceId) {
    return res.status(400).json({ message: "Workspace is required" });
  }

  const { id } = req.params;
  const updates = { ...req.body };
  const query = buildScopedTemplateQuery(req, ctx, id);
  const existing = await WidgetTemplate.findOne(query);
  if (!existing) {
    return res.status(404).json({ message: "Widget template not found" });
  }

  if (typeof updates.name === "string") {
    updates.name = updates.name.trim();
  }
  if (typeof updates.allowedUserEmail === "string") {
    updates.allowedUserEmail = updates.allowedUserEmail.trim().toLowerCase();
    if (updates.allowedUserEmail && !isValidEmail(updates.allowedUserEmail)) {
      return res.status(400).json({ message: "Allowed user email is invalid" });
    }
  }
  if (Array.isArray(updates.faqItems)) {
    updates.faqItems = normalizeFaqItems(updates.faqItems);
  }
  if (Array.isArray(updates.suggestedMessages)) {
    const faqItemsForAnswers = Array.isArray(updates.faqItems)
      ? updates.faqItems
      : existing.faqItems;
    updates.suggestedMessages = normalizeSuggestedMessages(
      updates.suggestedMessages,
      faqItemsForAnswers,
    );
  }
  if (typeof updates.isLogged !== "undefined") {
    updates.isLogged = Boolean(updates.isLogged);
  }
  if (typeof updates.autoReplySuggestions !== "undefined") {
    updates.autoReplySuggestions = updates.autoReplySuggestions !== false;
  }
  if (typeof updates.showFaqs !== "undefined") {
    updates.showFaqs = updates.showFaqs !== false;
  }
  if (typeof updates.preChatForm !== "undefined") {
    const normalizedPreChatForm = normalizePreChatForm(updates.preChatForm);
    if (normalizedPreChatForm.error) {
      return res.status(400).json({ message: normalizedPreChatForm.error });
    }
    updates.preChatForm = normalizedPreChatForm;
  }
  if (typeof updates.departmentSelection !== "undefined") {
    updates.departmentSelection = normalizeDepartmentSelection(
      updates.departmentSelection,
    );
  }
  if (typeof updates.businessHours !== "undefined") {
    updates.businessHours = normalizeBusinessHours(updates.businessHours);
  }

  const nextAllowedUserEmail =
    typeof updates.allowedUserEmail === "string"
      ? updates.allowedUserEmail
      : String(existing.allowedUserEmail || "")
          .trim()
          .toLowerCase();
  const nextPreChatForm =
    typeof updates.preChatForm !== "undefined"
      ? updates.preChatForm
      : existing.preChatForm;
  const allowedEmailConfigError = validateAllowedEmailFormConfig({
    allowedUserEmail: nextAllowedUserEmail,
    preChatForm: nextPreChatForm,
  });
  if (allowedEmailConfigError) {
    return res.status(400).json({ message: allowedEmailConfigError });
  }

  if (!ctx.isSuperAdmin) {
    delete updates.workspaceId;
  } else if (typeof updates.workspaceId !== "undefined") {
    updates.workspaceId = resolveWorkspaceId(updates.workspaceId) || null;
  }

  const updated = await WidgetTemplate.findOneAndUpdate(query, updates, {
    new: true,
    runValidators: true,
  }).select("-__v -accessToken");
  if (!updated) {
    return res.status(404).json({ message: "Widget template not found" });
  }

  return res.status(200).json({
    message: "Widget template updated successfully",
    data: updated,
  });
});

export const getWidgetTemplateScriptById = catchAsyncHandler(
  async (req, res) => {
    const ctx = getActorContext(req);
    if (!ctx.isSuperAdmin && !ctx.workspaceId) {
      return res.status(400).json({ message: "Workspace is required" });
    }

    const { id } = req.params;
    const query = buildScopedTemplateQuery(req, ctx, id);
    const template = await WidgetTemplate.findOne(query).select("+accessToken");

    if (!template) {
      return res.status(404).json({ message: "Widget template not found" });
    }

    if (!template.accessToken) {
      template.accessToken = crypto.randomBytes(24).toString("hex");
      await template.save();
    }

    const fallbackHost = `${req.protocol}://${req.get("host")}`;
    const apiHost =
      process.env.CLIENT_WIDGET_HOST || process.env.API_URL || fallbackHost;
    const resolvedApiHost = String(apiHost).replace(/\/+$/, "");

    const script = await ejs.renderFile(
      path.join(templatesDir, "widgets", "embed-script.ejs"),
      {
        apiHost: resolvedApiHost,
        widgetId: String(template._id),
        widgetToken: String(template.accessToken),
      },
      { async: true },
    );

    return res.status(200).json({
      message: "Widget script generated successfully",
      data: {
        widgetId: template._id,
        script,
      },
    });
  },
);

export const deleteWidgetTemplateById = catchAsyncHandler(async (req, res) => {
  const ctx = getActorContext(req);
  if (!ctx.isSuperAdmin && !ctx.workspaceId) {
    return res.status(400).json({ message: "Workspace is required" });
  }

  const { id } = req.params;
  const query = buildScopedTemplateQuery(req, ctx, id);
  const deleted = await WidgetTemplate.findOneAndDelete(query);

  if (!deleted) {
    return res.status(404).json({ message: "Widget template not found" });
  }

  return res.status(200).json({
    message: "Widget template deleted successfully",
    data: {
      _id: deleted._id,
      name: deleted.name,
    },
  });
});

const logoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = "uploads/";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      "widget-logo-" + uniqueSuffix + path.extname(file.originalname || ""),
    );
  },
});

export const logoUpload = multer({
  storage: logoStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (String(file.mimetype || "").startsWith("image/")) {
      cb(null, true);
      return;
    }
    cb(new Error("Only image files are allowed"));
  },
});

export const uploadWidgetLogo = catchAsyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No image uploaded" });
  }

  const ctx = getActorContext(req);
  if (!ctx.isSuperAdmin && !ctx.workspaceId) {
    return res.status(400).json({ message: "Workspace is required" });
  }

  const { id } = req.params;
  const query = buildScopedTemplateQuery(req, ctx, id);
  const existing = await WidgetTemplate.findOne(query);
  if (!existing) {
    return res.status(404).json({ message: "Widget template not found" });
  }

  const logoUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;

  const updated = await WidgetTemplate.findOneAndUpdate(
    query,
    { logoUrl: logoUrl.trim() },
    { new: true },
  ).select("-__v -accessToken");

  if (!updated) {
    return res.status(404).json({ message: "Widget template not found" });
  }

  return res.status(200).json({
    message: "Widget logo uploaded successfully",
    data: { logoUrl: updated.logoUrl },
  });
});
