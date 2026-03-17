import Groq from "groq-sdk";
import { AI_SYSTEM_PROMPT, AI_SYSTEM_ROLE } from "./utils.js";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export const normalizeAiText = (value) => {
  const text = String(value || "")
    .replace(/\r\n/g, "\n")
    .trim();

  if (!text) {
    return "I could not generate a response. Please try again.";
  }

  return text
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line, idx, arr) => !(line === "" && arr[idx - 1] === ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");
};

export const callGroqChatCompletion = async (
  messages,
  { model, temperature } = {},
) => {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not configured");
  }

  const completion = await groq.chat.completions.create({
    model: model || process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
    messages,
    temperature:
      Number.isFinite(Number(temperature)) && Number(temperature) >= 0
        ? Number(temperature)
        : 0.4,
    max_tokens: 1024,
  });

  return {
    content: completion.choices?.[0]?.message?.content || "",
    tokensUsed: Number(completion.usage?.total_tokens || 0),
    provider: "groq",
  };
};

export const generateAiResponse = async ({
  previousMessages,
  systemPrompt,
  model,
  temperature,
}) => {
  const formattedMessages = previousMessages.map((msg) => ({
    role:
      msg.senderType === "visitor" || msg.senderType === "user"
        ? "user"
        : "assistant",
    content: msg.content,
  }));

  const promptMessages = [
    {
      role: AI_SYSTEM_ROLE,
      content: systemPrompt || AI_SYSTEM_PROMPT,
    },
    ...formattedMessages,
  ];

  const completionResult = await callGroqChatCompletion(promptMessages, {
    model,
    temperature,
  });
  const aiResponse = normalizeAiText(completionResult.content);

  return {
    content: aiResponse,
    tokensUsed: completionResult.tokensUsed,
    provider: completionResult.provider,
  };
};
