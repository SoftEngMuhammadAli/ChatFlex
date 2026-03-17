import { generateAiResponse } from "../utils/ai.utils.js";
import { catchAsyncHandler } from "../middleware/error.middleware.js";
import { Message } from "../models/message.model.js";
import { Conversation } from "../models/conversation.model.js";
import { Usage, FAQ, Workspace } from "../models/index.js";
import { Billing } from "../models/billing.model.js";
import { User } from "../models/user.model.js";
import multer from "multer";
import path from "path";
import fs from "fs";

const DEFAULT_AI_TOKENS_LIMIT = 5000000;
const ESCALATION_INTENT_PATTERN =
  /\b(human|real person|agent|representative|support staff|someone)\b/i;
const VALID_MODES = new Set(["disabled", "faq-first", "hybrid", "ai-only"]);
const DEFAULT_CONFIDENCE_THRESHOLD = 0.6;

const getOrCreateUsageForRequest = async (user) =>
  Usage.findOneAndUpdate(
    user?.workspaceId
      ? { workspaceId: user.workspaceId }
      : { userId: user._id },
    {
      $setOnInsert: user?.workspaceId
        ? { workspaceId: user.workspaceId, scope: "workspace", aiTokensUsed: 0 }
        : { userId: user._id, scope: "user", aiTokensUsed: 0 },
    },
    { upsert: true, new: true },
  );

const getTokenLimit = async (user, workspace) => {
  const billing = await Billing.findOne({ user: user._id }).populate(
    "currentPlan",
  );
  const activeStatuses = new Set(["active", "purchased", "trialing"]);
  const planLimit = billing?.currentPlan?.limits?.aiTokens;
  if (activeStatuses.has(String(billing?.status || "")) && planLimit != null) {
    const numeric = Number(planLimit);
    return Number.isFinite(numeric) ? numeric : Number.MAX_SAFE_INTEGER;
  }

  const workspaceLimit = Number(workspace?.limits?.aiTokens);
  return Number.isFinite(workspaceLimit) && workspaceLimit > 0
    ? workspaceLimit
    : DEFAULT_AI_TOKENS_LIMIT;
};

const normalizeTokens = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2);

const scoreFaqMatch = (queryText, faq) => {
  const queryTokens = normalizeTokens(queryText);
  if (queryTokens.length === 0) return 0;

  const corpus = `${faq.question || ""} ${faq.answer || ""}`;
  const corpusTokens = new Set(normalizeTokens(corpus));
  let overlap = 0;

  for (const token of queryTokens) {
    if (corpusTokens.has(token)) overlap += 1;
  }

  const baseScore = overlap / queryTokens.length;
  const normalizedQuestion = String(faq.question || "").toLowerCase();
  const normalizedQuery = String(queryText || "").toLowerCase();
  const phraseBonus =
    normalizedQuestion && normalizedQuery.includes(normalizedQuestion)
      ? 0.25
      : 0;

  return Math.min(1, baseScore + phraseBonus);
};

const findBestFaqMatch = async ({ message, workspaceId }) => {
  const query = { status: "published" };
  if (workspaceId) {
    query.workspaceId = workspaceId;
  }

  const faqs = await FAQ.find(query)
    .select("question answer category status")
    .sort({ order: 1, updatedAt: -1 })
    .limit(150)
    .lean();

  if (!Array.isArray(faqs) || faqs.length === 0) return null;

  let best = null;
  for (const faq of faqs) {
    const score = scoreFaqMatch(message, faq);
    if (!best || score > best.score) {
      best = { faq, score };
    }
  }

  if (!best) return null;
  return best;
};

const normalizeAiMode = (workspace) => {
  const mode = String(workspace?.aiSettings?.mode || "faq-first").toLowerCase();
  if (!VALID_MODES.has(mode)) return "faq-first";
  return mode;
};

const getConfidenceThreshold = (workspace) => {
  const raw = Number(workspace?.aiSettings?.confidenceThreshold);
  if (!Number.isFinite(raw)) return DEFAULT_CONFIDENCE_THRESHOLD;
  return Math.max(0, Math.min(1, raw));
};

const isEscalationRequested = (text) =>
  ESCALATION_INTENT_PATTERN.test(String(text || ""));

const assignEscalationAgent = async ({ conversation, workspaceId }) => {
  if (!workspaceId) return;

  const availableAgent = await User.findOne({
    workspaceId,
    role: { $in: ["owner", "admin", "agent"] },
  })
    .select("_id")
    .sort({ status: 1, updatedAt: -1 });

  if (!availableAgent) return;

  conversation.assignedAgent = availableAgent._id;
  conversation.assignedTo = availableAgent._id;
};

const buildEscalationMessage = (workspace) =>
  String(workspace?.aiSettings?.fallbackMessage || "").trim() ||
  "I can connect you with a human agent for this request.";

const detectMessageLanguage = (text) => {
  const content = String(text || "");
  if (!content.trim()) return "en";

  if (/[\u0600-\u06FF]/.test(content)) return "ur";
  if (/[\u0900-\u097F]/.test(content)) return "hi";
  if (/[\u4E00-\u9FFF]/.test(content)) return "zh";
  if (/[\u3040-\u30ff]/.test(content)) return "ja";
  if (/\b(hola|gracias|por favor|ayuda|necesito)\b/i.test(content)) return "es";
  if (/\b(bonjour|merci|sil vous plait|aide|besoin)\b/i.test(content)) return "fr";
  if (/\b(hallo|danke|bitte|hilfe)\b/i.test(content)) return "de";
  if (/\b(ciao|grazie|aiuto)\b/i.test(content)) return "it";
  if (/\b(ola|obrigado|obrigada|ajuda|preciso)\b/i.test(content)) return "pt";
  return "en";
};

const getTargetLanguage = (workspace, visitorMessage, conversation = null) => {
  const aiSettings = workspace?.aiSettings || {};
  const forcedLanguage = String(
    aiSettings.responseLanguage || "auto",
  ).toLowerCase();
  if (forcedLanguage && forcedLanguage !== "auto") return forcedLanguage;

  const conversationHint = String(
    conversation?.metadata?.visitorInfo?.language ||
      conversation?.metadata?.language ||
      "",
  )
    .trim()
    .toLowerCase();
  if (conversationHint) {
    return conversationHint.split(/[-_]/)[0];
  }

  if (aiSettings.autoDetectLanguage === false) {
    return "en";
  }

  return detectMessageLanguage(visitorMessage);
};

const languageInstruction = (code) => {
  const normalized = String(code || "en").toLowerCase();
  const map = {
    en: "English",
    ur: "Urdu",
    es: "Spanish",
    fr: "French",
    de: "German",
    it: "Italian",
    pt: "Portuguese",
    zh: "Chinese",
    ja: "Japanese",
    ar: "Arabic",
    hi: "Hindi",
  };
  return map[normalized] || "English";
};

const buildAiSystemPrompt = ({ workspace, languageCode }) => {
  const tone = String(
    workspace?.aiSettings?.brandTone || "professional",
  ).trim();
  const toneInstruction = tone
    ? `Adopt this brand tone: ${tone}.`
    : "Use a clear, professional support tone.";

  return [
    "You are ChatFlex AI support assistant.",
    toneInstruction,
    `Reply in ${languageInstruction(languageCode)} unless user asks for another language.`,
    "Keep response concise, practical, and customer-support oriented.",
  ].join(" ");
};

const normalizeKnowledgeTokens = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2);

const scoreKnowledgeEntry = (query, text) => {
  const queryTokens = normalizeKnowledgeTokens(query);
  if (queryTokens.length === 0) return 0;
  const corpus = new Set(normalizeKnowledgeTokens(text));
  if (corpus.size === 0) return 0;
  let hits = 0;
  queryTokens.forEach((token) => {
    if (corpus.has(token)) hits += 1;
  });
  return hits / queryTokens.length;
};

const buildKnowledgeContext = (workspace, query) => {
  const sources = workspace?.aiSettings?.knowledgeSources || {};
  const manualQnA = Array.isArray(sources.manualQnA) ? sources.manualQnA : [];
  const websitePages = Array.isArray(sources.websitePages)
    ? sources.websitePages
    : [];
  const pdfFiles = Array.isArray(sources.pdfFiles) ? sources.pdfFiles : [];
  const candidates = [];

  manualQnA.forEach((entry) => {
    const text = `${entry?.question || ""}\n${entry?.answer || ""}`.trim();
    const score = scoreKnowledgeEntry(query, text);
    if (score >= 0.2) {
      candidates.push({
        score,
        source: `Manual Q&A: ${String(entry?.question || "").trim()}`,
        snippet: String(entry?.answer || "").trim(),
      });
    }
  });

  websitePages.forEach((entry) => {
    if (String(entry?.indexingStatus || "") === "failed") return;
    const text = String(entry?.content || "").trim();
    const score = scoreKnowledgeEntry(query, text);
    if (score >= 0.16 && text) {
      candidates.push({
        score,
        source: `Website: ${String(entry?.url || "").trim()}`,
        snippet: text.slice(0, 900),
      });
    }
  });

  pdfFiles.forEach((entry) => {
    if (String(entry?.indexingStatus || "") === "failed") return;
    const text = String(entry?.extractedText || "").trim();
    const score = scoreKnowledgeEntry(query, text);
    if (score >= 0.16 && text) {
      candidates.push({
        score,
        source: `PDF: ${String(entry?.name || "").trim()}`,
        snippet: text.slice(0, 900),
      });
    }
  });

  const top = candidates.sort((a, b) => b.score - a.score).slice(0, 4);
  if (top.length === 0) return "";

  return top
    .map(
      (item, index) =>
        `${index + 1}. ${item.source}\n${String(item.snippet || "").trim()}`,
    )
    .join("\n\n");
};

const extractTextFromHtml = (html) =>
  String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const extractTextFromPdfBuffer = (buffer) => {
  const content = Buffer.isBuffer(buffer) ? buffer.toString("latin1") : "";
  const textSegments = content.match(/[A-Za-z0-9\u0600-\u06FF][A-Za-z0-9\u0600-\u06FF\s,.;:'"!?()\-_/]{20,}/g) || [];
  return textSegments.join(" ").replace(/\s+/g, " ").trim().slice(0, 120000);
};

const fallbackConversationSummary = ({ conversation, messages }) => {
  const items = Array.isArray(messages) ? messages : [];
  const visitorMessages = items.filter(
    (msg) => String(msg.senderType) === "visitor",
  );
  const agentMessages = items.filter((msg) =>
    ["agent", "owner", "admin", "ai"].includes(String(msg.senderType)),
  );

  const firstIssue = String(visitorMessages[0]?.content || "").trim();
  const latestIssue = String(
    visitorMessages[visitorMessages.length - 1]?.content || "",
  ).trim();
  const latestReply = String(
    agentMessages[agentMessages.length - 1]?.content || "",
  ).trim();

  const summaryLines = [
    `Status: ${String(conversation?.status || "open")}`,
    `Messages: total ${items.length}, visitor ${visitorMessages.length}, support ${agentMessages.length}`,
    `First issue: ${firstIssue || "N/A"}`,
    `Latest issue: ${latestIssue || "N/A"}`,
    `Latest reply: ${latestReply || "N/A"}`,
  ];

  return summaryLines.join("\n");
};

const buildSuggestedRepliesFallback = ({
  latestVisitorMessage,
  faqCandidates,
}) => {
  const suggestions = [];

  if (Array.isArray(faqCandidates)) {
    faqCandidates.slice(0, 2).forEach((entry) => {
      const answer = String(entry?.faq?.answer || "").trim();
      if (answer) {
        suggestions.push(
          answer.length > 220 ? `${answer.slice(0, 217)}...` : answer,
        );
      }
    });
  }

  const normalizedQuestion = String(latestVisitorMessage || "").trim();
  if (normalizedQuestion) {
    suggestions.push(
      "Thanks for sharing this. Let me check that for you right away.",
    );
    suggestions.push(
      "I can help with this. Could you share one more detail so I can resolve it faster?",
    );
  }

  return Array.from(new Set(suggestions)).slice(0, 4);
};

const ensureWorkspaceForAiRequest = async (req) => {
  const role = String(req.user?.role || "").toLowerCase();
  const workspaceId =
    role === "super-admin"
      ? String(
          req.body?.workspaceId ||
            req.query?.workspaceId ||
            req.user?.workspaceId ||
            "",
        )
      : String(req.user?.workspaceId || "");

  if (!workspaceId) return null;
  const workspace = await Workspace.findById(workspaceId);
  return workspace || null;
};

const sanitizeAiSettingsInput = (payload = {}) => {
  const updates = {};

  if (typeof payload.mode === "string") {
    const mode = payload.mode.trim().toLowerCase();
    if (VALID_MODES.has(mode)) updates.mode = mode;
  }

  if (typeof payload.escalationEnabled === "boolean") {
    updates.escalationEnabled = payload.escalationEnabled;
  }

  if (typeof payload.fallbackMessage === "string") {
    updates.fallbackMessage = payload.fallbackMessage.trim();
  }

  if (typeof payload.brandTone === "string") {
    updates.brandTone = payload.brandTone.trim().slice(0, 120);
  }

  if (payload.confidenceThreshold != null) {
    const confidence = Number(payload.confidenceThreshold);
    if (Number.isFinite(confidence)) {
      updates.confidenceThreshold = Math.max(0, Math.min(1, confidence));
    }
  }

  if (typeof payload.autoDetectLanguage === "boolean") {
    updates.autoDetectLanguage = payload.autoDetectLanguage;
  }

  if (typeof payload.responseLanguage === "string") {
    updates.responseLanguage =
      payload.responseLanguage.trim().toLowerCase() || "auto";
  }

  if (typeof payload.model === "string") {
    updates.model = payload.model.trim();
  }

  if (payload.temperature != null) {
    const temperature = Number(payload.temperature);
    if (Number.isFinite(temperature)) {
      updates.temperature = Math.max(0, Math.min(1, temperature));
    }
  }

  if (
    payload.knowledgeSources &&
    typeof payload.knowledgeSources === "object"
  ) {
    const knowledgeSources = {};

    if (typeof payload.knowledgeSources.manualFaqEnabled === "boolean") {
      knowledgeSources.manualFaqEnabled =
        payload.knowledgeSources.manualFaqEnabled;
    }

    if (Array.isArray(payload.knowledgeSources.websiteUrls)) {
      knowledgeSources.websiteUrls = Array.from(
        new Set(
          payload.knowledgeSources.websiteUrls
            .map((url) => String(url || "").trim())
            .filter(Boolean),
        ),
      ).slice(0, 100);
    }

    if (Array.isArray(payload.knowledgeSources.manualQnA)) {
      knowledgeSources.manualQnA = payload.knowledgeSources.manualQnA
        .map((entry) => ({
          question: String(entry?.question || "").trim(),
          answer: String(entry?.answer || "").trim(),
          tags: Array.isArray(entry?.tags)
            ? entry.tags.map((tag) => String(tag || "").trim()).filter(Boolean)
            : [],
          updatedAt: new Date(),
        }))
        .filter((entry) => entry.question && entry.answer)
        .slice(0, 300);
    }

    updates.knowledgeSources = knowledgeSources;
  }

  return updates;
};

export const getAIResponse = catchAsyncHandler(async (req, res) => {
  const { message, conversationId } = req.body;
  const currentUserId = req.user._id;
  const workspace = await ensureWorkspaceForAiRequest(req);
  const workspaceId = String(workspace?._id || req.user?.workspaceId || "");

  if (!message) {
    return res.status(400).json({ message: "Message is required" });
  }

  let conversation;

  if (conversationId) {
    conversation = await Conversation.findOne({
      _id: conversationId,
      initiatedBy: currentUserId,
      ...(workspaceId ? { workspaceId } : {}),
    });

    if (!conversation) {
      return res.status(403).json({ message: "Conversation access denied" });
    }
  }

  if (!conversation) {
    conversation = await Conversation.create({
      visitorId: "ai-user-" + Date.now(),
      initiatedBy: currentUserId,
      ...(workspaceId ? { workspaceId } : {}),
      status: "open",
      metadata: {
        ip: req.ip,
        userAgent: req.headers["user-agent"],
        language: detectMessageLanguage(message),
      },
    });
  }

  const usage = await getOrCreateUsageForRequest(req.user);
  const aiTokensLimit = await getTokenLimit(req.user, workspace);

  if (usage.aiTokensUsed >= aiTokensLimit) {
    return res.status(403).json({ message: "AI token limit reached" });
  }

  await Message.create({
    conversationId: conversation._id,
    ...(workspaceId ? { workspaceId } : {}),
    senderId: currentUserId,
    senderType: "visitor",
    content: message,
  });

  const aiMode = normalizeAiMode(workspace);
  const faqMatch = await findBestFaqMatch({ message, workspaceId });
  const escalationEnabled = workspace?.aiSettings?.escalationEnabled !== false;
  const confidenceThreshold = getConfidenceThreshold(workspace);
  const shouldEscalateByIntent =
    escalationEnabled && isEscalationRequested(message);
  const hasConfidentFaq =
    faqMatch && Number(faqMatch.score || 0) >= confidenceThreshold;

  let aiResponse = "";
  let tokensUsed = 0;
  let provider = "workflow";
  let source = "ai";

  if (aiMode === "disabled") {
    aiResponse =
      "AI assistant is currently disabled for this workspace. A human agent will assist you.";
    source = "disabled";
    if (escalationEnabled) {
      conversation.status = "pending";
      await assignEscalationAgent({ conversation, workspaceId });
    }
  } else if (shouldEscalateByIntent) {
    aiResponse = buildEscalationMessage(workspace);
    source = "escalation";
    conversation.status = "escalated";
    await assignEscalationAgent({ conversation, workspaceId });
  } else if (aiMode === "faq-first" && hasConfidentFaq) {
    aiResponse = faqMatch.faq.answer;
    source = "faq";
  } else if (aiMode === "faq-first" && !hasConfidentFaq) {
    aiResponse = buildEscalationMessage(workspace);
    source = "faq-fallback";
    if (escalationEnabled) {
      conversation.status = "pending";
      await assignEscalationAgent({ conversation, workspaceId });
    }
  } else {
    const previousMessages = await Message.find({
      conversationId: conversation._id,
    })
      .sort({ createdAt: 1 })
      .limit(25);

    if (aiMode === "hybrid" && hasConfidentFaq && previousMessages.length > 0) {
      const latest = previousMessages[previousMessages.length - 1];
      if (String(latest.senderType) === "visitor") {
        latest.content = `${latest.content}\n\nHelpful FAQ context:\nQ: ${faqMatch.faq.question}\nA: ${faqMatch.faq.answer}`;
      }
      source = "hybrid";
    }

    const languageCode = getTargetLanguage(workspace, message, conversation);
    const knowledgeContext = buildKnowledgeContext(workspace, message);
    const systemPrompt = knowledgeContext
      ? `${buildAiSystemPrompt({ workspace, languageCode })}\nUse the following verified knowledge context when relevant:\n${knowledgeContext}`
      : buildAiSystemPrompt({ workspace, languageCode });
    const completionResult = await generateAiResponse({
      previousMessages,
      systemPrompt,
      model: workspace?.aiSettings?.model,
      temperature: workspace?.aiSettings?.temperature,
    });
    aiResponse = completionResult.content;
    tokensUsed = Number(completionResult.tokensUsed || 0);
    provider = completionResult.provider || "groq";

    if (
      aiMode === "hybrid" &&
      !hasConfidentFaq &&
      escalationEnabled &&
      Number(faqMatch?.score || 0) < confidenceThreshold * 0.55
    ) {
      conversation.status = "pending";
      await assignEscalationAgent({ conversation, workspaceId });
      source = "hybrid-escalated";
    }
  }

  if (tokensUsed > 0) {
    usage.aiTokensUsed += tokensUsed;
    await usage.save();
  }

  const aiMessage = await Message.create({
    conversationId: conversation._id,
    ...(workspaceId ? { workspaceId } : {}),
    senderType: "ai",
    content: aiResponse,
  });

  conversation.metadata = {
    ...(conversation.metadata || {}),
    language: getTargetLanguage(workspace, message, conversation),
  };
  conversation.lastMessageAt = Date.now();
  await conversation.save();

  return res.json({
    conversationId: conversation._id,
    ai: aiMessage,
    response: aiResponse,
    tokensUsed,
    provider,
    mode: aiMode,
    source,
    confidence: Number(faqMatch?.score || 0),
    threshold: confidenceThreshold,
    escalated: ["escalated", "pending"].includes(
      String(conversation.status || ""),
    ),
  });
});

export const getLatestAIConversation = catchAsyncHandler(async (req, res) => {
  const workspaceId = req.user?.workspaceId;
  const conversation = await Conversation.findOne({
    initiatedBy: req.user._id,
    ...(workspaceId ? { workspaceId } : {}),
    visitorId: { $regex: /^ai-user-/ },
  }).sort({ lastMessageAt: -1 });

  return res.status(200).json({ data: conversation });
});

export const getAIConversationMessages = catchAsyncHandler(async (req, res) => {
  const workspaceId = req.user?.workspaceId;
  const conversation = await Conversation.findOne({
    _id: req.params.id,
    initiatedBy: req.user._id,
    ...(workspaceId ? { workspaceId } : {}),
  });

  if (!conversation) {
    return res.status(404).json({ message: "Conversation not found" });
  }

  const messages = await Message.find({
    conversationId: conversation._id,
    ...(workspaceId ? { workspaceId } : {}),
  }).sort({ createdAt: 1 });

  return res.status(200).json({ data: messages });
});

export const getWorkspaceAISettings = catchAsyncHandler(async (req, res) => {
  const workspace = await ensureWorkspaceForAiRequest(req);
  if (!workspace) {
    return res.status(404).json({ message: "Workspace not found" });
  }

  const aiSettings = workspace.aiSettings || {};
  return res.status(200).json({
    data: {
      mode: normalizeAiMode(workspace),
      escalationEnabled: aiSettings.escalationEnabled !== false,
      fallbackMessage:
        String(aiSettings.fallbackMessage || "").trim() ||
        "I can connect you with a human agent for this request.",
      brandTone: String(aiSettings.brandTone || "professional"),
      confidenceThreshold: getConfidenceThreshold(workspace),
      autoDetectLanguage: aiSettings.autoDetectLanguage !== false,
      responseLanguage: String(aiSettings.responseLanguage || "auto"),
      model: String(aiSettings.model || ""),
      temperature: Number(aiSettings.temperature || 0.3),
      knowledgeSources: {
        manualFaqEnabled:
          aiSettings?.knowledgeSources?.manualFaqEnabled !== false,
        manualQnA: Array.isArray(aiSettings?.knowledgeSources?.manualQnA)
          ? aiSettings.knowledgeSources.manualQnA
          : [],
        websiteUrls: Array.isArray(aiSettings?.knowledgeSources?.websiteUrls)
          ? aiSettings.knowledgeSources.websiteUrls
          : [],
        websitePages: Array.isArray(aiSettings?.knowledgeSources?.websitePages)
          ? aiSettings.knowledgeSources.websitePages
          : [],
        pdfFiles: Array.isArray(aiSettings?.knowledgeSources?.pdfFiles)
          ? aiSettings.knowledgeSources.pdfFiles
          : [],
      },
    },
  });
});

export const updateWorkspaceAISettings = catchAsyncHandler(async (req, res) => {
  const workspace = await ensureWorkspaceForAiRequest(req);
  if (!workspace) {
    return res.status(404).json({ message: "Workspace not found" });
  }

  const updates = sanitizeAiSettingsInput(req.body || {});
  workspace.aiSettings = {
    ...(workspace.aiSettings?.toObject?.() || workspace.aiSettings || {}),
    ...updates,
    ...(updates.knowledgeSources
      ? {
          knowledgeSources: {
            ...((
              workspace.aiSettings?.toObject?.() ||
              workspace.aiSettings ||
              {}
            ).knowledgeSources || {}),
            ...updates.knowledgeSources,
          },
        }
      : {}),
  };

  await workspace.save();

  return res.status(200).json({
    message: "AI settings updated successfully",
    data: workspace.aiSettings,
  });
});

export const getConversationAISummary = catchAsyncHandler(async (req, res) => {
  const workspace = await ensureWorkspaceForAiRequest(req);
  if (!workspace) {
    return res.status(404).json({ message: "Workspace not found" });
  }

  const conversation = await Conversation.findOne({
    _id: req.params.id,
    workspaceId: workspace._id,
  });

  if (!conversation) {
    return res.status(404).json({ message: "Conversation not found" });
  }

  const messages = await Message.find({
    conversationId: conversation._id,
    workspaceId: workspace._id,
  })
    .sort({ createdAt: 1 })
    .limit(60);

  const fallbackSummary = fallbackConversationSummary({
    conversation,
    messages,
  });

  let summary = fallbackSummary;
  let provider = "local";
  let tokensUsed = 0;

  try {
    const completion = await generateAiResponse({
      previousMessages: [
        {
          senderType: "user",
          content:
            "Provide a concise conversation summary with issue, actions taken, current status, and next step.",
        },
        ...messages,
      ],
      systemPrompt:
        "You summarize support conversations for agents. Return concise plain text with 4-6 bullet points.",
      model: workspace?.aiSettings?.model,
      temperature: 0.2,
    });

    if (String(completion.content || "").trim()) {
      summary = completion.content;
      provider = completion.provider || "groq";
      tokensUsed = Number(completion.tokensUsed || 0);
    }
  } catch {
    provider = "local";
  }

  return res.status(200).json({
    data: {
      conversationId: String(conversation._id),
      summary,
      provider,
      tokensUsed,
    },
  });
});

export const getConversationAISuggestions = catchAsyncHandler(
  async (req, res) => {
    const workspace = await ensureWorkspaceForAiRequest(req);
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    const conversation = await Conversation.findOne({
      _id: req.params.id,
      workspaceId: workspace._id,
    });

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    const messages = await Message.find({
      conversationId: conversation._id,
      workspaceId: workspace._id,
    })
      .sort({ createdAt: 1 })
      .limit(50);

    const latestVisitor = [...messages]
      .reverse()
      .find((msg) => String(msg.senderType) === "visitor");
    const latestVisitorMessage = String(
      latestVisitor?.content || req.body?.message || "",
    ).trim();

    const faqCandidates = [];
    if (latestVisitorMessage) {
      const query = { status: "published", workspaceId: workspace._id };
      const faqs = await FAQ.find(query)
        .select("question answer")
        .limit(100)
        .lean();
      for (const faq of faqs) {
        const score = scoreFaqMatch(latestVisitorMessage, faq);
        if (score >= 0.35) {
          faqCandidates.push({ faq, score });
        }
      }
      faqCandidates.sort((a, b) => b.score - a.score);
    }

    let suggestions = buildSuggestedRepliesFallback({
      latestVisitorMessage,
      faqCandidates,
    });

    try {
      const aiResult = await generateAiResponse({
        previousMessages: [
          {
            senderType: "user",
            content: `Generate up to 4 short reply suggestions for this visitor message: ${latestVisitorMessage}`,
          },
        ],
        systemPrompt:
          "You generate customer-support reply suggestions. Return each suggestion on a new line without numbering.",
        model: workspace?.aiSettings?.model,
        temperature: 0.4,
      });

      const generated = String(aiResult?.content || "")
        .split("\n")
        .map((line) => line.replace(/^[-*\d.\s]+/, "").trim())
        .filter(Boolean)
        .slice(0, 4);

      if (generated.length > 0) {
        suggestions = generated;
      }
    } catch {
      // Keep fallback suggestions.
    }

    return res.status(200).json({
      data: {
        conversationId: String(conversation._id),
        suggestions,
      },
    });
  },
);

const crawlWebsiteSource = async (url) => {
  const normalizedUrl = String(url || "").trim();
  if (!normalizedUrl) {
    return {
      url: normalizedUrl,
      title: "",
      content: "",
      indexingStatus: "failed",
      indexedAt: new Date(),
      error: "URL is required",
    };
  }

  try {
    const parsed = new URL(normalizedUrl);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("Only http/https URLs are supported");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(parsed.toString(), {
      method: "GET",
      signal: controller.signal,
      headers: {
        "user-agent": "ChatFlexBot/1.0 (+knowledge-crawler)",
      },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html || "");
    const title = String(titleMatch?.[1] || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 250);
    const content = extractTextFromHtml(html).slice(0, 120000);

    return {
      url: parsed.toString(),
      title,
      content,
      indexingStatus: content ? "indexed" : "failed",
      indexedAt: new Date(),
      error: content ? "" : "No readable content extracted",
    };
  } catch (error) {
    return {
      url: normalizedUrl,
      title: "",
      content: "",
      indexingStatus: "failed",
      indexedAt: new Date(),
      error: String(error?.message || "Crawl failed"),
    };
  }
};

const knowledgeStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = "uploads/knowledge";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      "knowledge-" + uniqueSuffix + path.extname(file.originalname || ""),
    );
  },
});

export const knowledgeUpload = multer({
  storage: knowledgeStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
});

export const uploadKnowledgePdf = catchAsyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  const workspace = await ensureWorkspaceForAiRequest(req);
  if (!workspace) {
    return res.status(404).json({ message: "Workspace not found" });
  }

  const fileUrl = `${req.protocol}://${req.get("host")}/uploads/knowledge/${req.file.filename}`;
  const filePath = path.join("uploads", "knowledge", req.file.filename);
  let extractedText = "";
  let indexingStatus = "queued";
  let extractionError = "";

  try {
    const fileBuffer = fs.readFileSync(filePath);
    extractedText = extractTextFromPdfBuffer(fileBuffer);
    indexingStatus = extractedText ? "indexed" : "failed";
    if (!extractedText) {
      extractionError = "No readable text extracted from PDF";
    }
  } catch (error) {
    indexingStatus = "failed";
    extractionError = String(error?.message || "PDF extraction failed");
  }

  const nextEntry = {
    name: req.file.originalname,
    url: fileUrl,
    uploadedAt: new Date(),
    extractedText,
    indexingStatus,
    indexedAt: new Date(),
    error: extractionError,
  };

  const aiSettings =
    workspace.aiSettings?.toObject?.() || workspace.aiSettings || {};
  const sources = aiSettings.knowledgeSources || {};

  workspace.aiSettings = {
    ...aiSettings,
    knowledgeSources: {
      ...sources,
      pdfFiles: [
        ...(Array.isArray(sources.pdfFiles) ? sources.pdfFiles : []),
        nextEntry,
      ].slice(-50),
    },
  };

  await workspace.save();

  return res.status(200).json({
    message: "Knowledge PDF uploaded successfully",
    data: nextEntry,
  });
});

export const addKnowledgeWebsite = catchAsyncHandler(async (req, res) => {
  const workspace = await ensureWorkspaceForAiRequest(req);
  if (!workspace) {
    return res.status(404).json({ message: "Workspace not found" });
  }

  const url = String(req.body?.url || "").trim();
  if (!url) {
    return res.status(400).json({ message: "url is required" });
  }

  const aiSettings =
    workspace.aiSettings?.toObject?.() || workspace.aiSettings || {};
  const sources = aiSettings.knowledgeSources || {};
  const crawledPage = await crawlWebsiteSource(url);
  const websiteUrls = Array.from(
    new Set([
      ...(Array.isArray(sources.websiteUrls) ? sources.websiteUrls : []),
      crawledPage.url || url,
    ]),
  ).slice(-100);
  const existingPages = Array.isArray(sources.websitePages)
    ? sources.websitePages.filter(
        (entry) =>
          String(entry?.url || "").trim() !== String(crawledPage.url || "").trim(),
      )
    : [];
  const websitePages = [...existingPages, crawledPage].slice(-200);

  workspace.aiSettings = {
    ...aiSettings,
    knowledgeSources: {
      ...sources,
      websiteUrls,
      websitePages,
    },
  };

  await workspace.save();

  return res.status(200).json({
    message: "Website knowledge source added",
    data: { websiteUrls, crawledPage },
  });
});



