const Conversation = require("../models/Conversation");
const FAQ = require("../models/FAQ");
const Message = require("../models/Message");
const Workspace = require("../models/Workspace");

const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

const normalize = (text) =>
  String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const keywordScore = (query, candidate) => {
  const queryWords = normalize(query)
    .split(" ")
    .filter((word) => word.length > 2);
  const candidateWords = new Set(
    normalize(candidate)
      .split(" ")
      .filter((word) => word.length > 2)
  );
  if (queryWords.length === 0) return 0;
  let matches = 0;
  for (const word of queryWords) {
    if (candidateWords.has(word)) {
      matches += 1;
    }
  }
  return matches / queryWords.length;
};

const findBestFaqAnswer = async (workspaceId, question) => {
  const faqs = await FAQ.find({ workspaceId, status: "published" }).limit(200);
  let best = null;
  let bestScore = 0;

  for (const faq of faqs) {
    const score = keywordScore(question, `${faq.question} ${faq.answer}`);
    if (score > bestScore) {
      best = faq;
      bestScore = score;
    }
  }

  if (!best || bestScore < 0.35) {
    return null;
  }

  return {
    answer: best.answer,
    source: `FAQ:${best._id}`,
    confidence: Math.min(0.95, Math.max(0.45, bestScore))
  };
};

const callOpenAI = async ({ workspace, userMessage, recentMessages, faqContext }) => {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  const systemPrompt = [
    "You are ChatFlex support AI.",
    "Respond with short, practical support guidance.",
    "If unsure, ask clarifying questions and recommend escalation to a human agent.",
    `Workspace AI mode: ${workspace.settings?.aiMode || "hybrid"}.`
  ].join(" ");

  const knowledgeBlock = faqContext.length
    ? `Known FAQ context:\n${faqContext.map((faq) => `Q: ${faq.question}\nA: ${faq.answer}`).join("\n\n")}`
    : "No FAQ context provided.";

  const transcript = recentMessages
    .map((msg) => `${msg.senderType}: ${msg.content}`)
    .join("\n")
    .slice(-2500);

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.3,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "system", content: knowledgeBlock },
        { role: "system", content: `Recent transcript:\n${transcript || "No prior messages."}` },
        { role: "user", content: userMessage }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI request failed: ${errorText}`);
  }

  const data = await response.json();
  const answer = data.choices?.[0]?.message?.content?.trim();
  if (!answer) {
    return null;
  }

  return {
    answer,
    source: "LLM",
    confidence: 0.6
  };
};

const respond = async (req, res, next) => {
  try {
    const { conversationId, message } = req.body;
    if (!conversationId || !message) {
      return res.status(400).json({ message: "conversationId and message are required" });
    }

    const [workspace, conversation] = await Promise.all([
      Workspace.findById(req.user.workspaceId),
      Conversation.findOne({ _id: conversationId, workspaceId: req.user.workspaceId })
    ]);

    if (!workspace || !conversation) {
      return res.status(404).json({ message: "Workspace or conversation not found" });
    }

    const aiMode = workspace.settings?.aiMode || "hybrid";
    if (aiMode === "disabled") {
      return res.json({
        handledBy: "human",
        escalated: true,
        reason: "AI mode is disabled for this workspace."
      });
    }

    let result = await findBestFaqAnswer(req.user.workspaceId, message);

    if (!result && aiMode === "faq-first") {
      return res.json({
        handledBy: "human",
        escalated: true,
        reason: "No FAQ answer found."
      });
    }

    if (!result && aiMode === "hybrid") {
      const recentMessages = await Message.find({
        workspaceId: req.user.workspaceId,
        conversationId
      })
        .sort({ createdAt: -1 })
        .limit(12);
      const faqContext = await FAQ.find({
        workspaceId: req.user.workspaceId,
        status: "published"
      })
        .sort({ updatedAt: -1 })
        .limit(8);

      result = await callOpenAI({
        workspace,
        userMessage: message,
        recentMessages: recentMessages.reverse(),
        faqContext
      });
    }

    if (!result) {
      return res.json({
        handledBy: "human",
        escalated: true,
        reason: "AI could not generate a confident answer."
      });
    }

    const aiMessage = await Message.create({
      workspaceId: req.user.workspaceId,
      conversationId,
      senderType: "ai",
      content: result.answer
    });

    const io = req.app.get("io");
    io.to(`workspace:${req.user.workspaceId}`).emit("conversation:message", {
      conversationId,
      message: aiMessage
    });

    return res.json({
      handledBy: "ai",
      escalated: false,
      confidence: result.confidence,
      source: result.source,
      reply: aiMessage
    });
  } catch (error) {
    return next(error);
  }
};

const summarizeConversation = async (req, res, next) => {
  try {
    const { conversationId } = req.params;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      workspaceId: req.user.workspaceId
    });

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    const messages = await Message.find({
      workspaceId: req.user.workspaceId,
      conversationId
    })
      .sort({ createdAt: 1 })
      .limit(50);

    if (messages.length === 0) {
      return res.json({ summary: "No messages in this conversation yet." });
    }

    if (!process.env.OPENAI_API_KEY) {
      const summary = [
        `Total messages: ${messages.length}`,
        `Last sender: ${messages[messages.length - 1].senderType}`,
        `Latest message: ${messages[messages.length - 1].content.slice(0, 180)}`
      ].join(" | ");
      return res.json({ summary, source: "fallback" });
    }

    const transcript = messages
      .map((msg) => `${msg.senderType}: ${msg.content}`)
      .join("\n")
      .slice(-5000);

    const completion = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "Summarize this support conversation in 4 short bullets: issue, actions taken, current status, and recommended next step."
          },
          { role: "user", content: transcript }
        ]
      })
    });

    if (!completion.ok) {
      const fallback = `Summary unavailable. Last message: ${messages[messages.length - 1].content.slice(0, 180)}`;
      return res.json({ summary: fallback, source: "fallback" });
    }

    const data = await completion.json();
    const summary = data.choices?.[0]?.message?.content?.trim() || "Summary unavailable.";

    return res.json({ summary, source: "LLM" });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  respond,
  summarizeConversation
};
