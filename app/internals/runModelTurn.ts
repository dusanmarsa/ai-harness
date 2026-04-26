import { createOpenAI } from "@ai-sdk/openai";
import type { AssistantModelMessage, ModelMessage } from "ai";
import { stepCountIs, streamText } from "ai";

import { createModelTools } from "../tools";

const openaiProvider = createOpenAI({
  apiKey: process.env.OPEN_AI_API_KEY ?? process.env.OPENAI_API_KEY,
});

const chatModel = openaiProvider("gpt-4.1");

export const DEFAULT_SYSTEM_CONTENT =
  "You are a helpful assistant that can answer questions and help with tasks.";

export const createMessagesArray = (firstUserMessage?: string): ModelMessage[] => {
  const base: ModelMessage[] = [
    { role: "system", content: DEFAULT_SYSTEM_CONTENT },
  ];

  if (firstUserMessage) {
    base.push({ role: "user", content: firstUserMessage });
  }

  return base;
};

export const getLastAssistantMessage = (
  messages: ModelMessage[],
): AssistantModelMessage | null => {
  let lastAssistantMessage: AssistantModelMessage | null = null;

  for (const m of messages) {
    if (m.role === "assistant") {
      lastAssistantMessage = m;
    }
  }

  return lastAssistantMessage;
};

export const assistantText = (message: AssistantModelMessage): string => {
  const { content } = message;
  if (typeof content === "string") {
    return content;
  }
  return content
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((p) => p.text)
    .join("");
};

export type RunModelTurnOptions = {
  onToolLog?: (message: string) => void;
  onChunk?: (delta: string) => void;
};

export const runModelTurn = async (
  messages: ModelMessage[],
  options?: RunModelTurnOptions,
): Promise<void> => {
  const { onToolLog, onChunk } = options ?? {};

  const tools = createModelTools({ onLog: onToolLog });

  const promptMessages = messages.filter((m) => m.role !== "system");

  const result = streamText({
    model: chatModel,
    system: DEFAULT_SYSTEM_CONTENT,
    messages: promptMessages,
    tools,
    stopWhen: stepCountIs(20),
    onChunk: ({ chunk }) => {
      if (chunk.type === "text-delta") {
        onChunk?.(chunk.text);
      }
    },
  });

  await result.consumeStream();

  const steps = await result.steps;
  
  for (const step of steps) {
    for (const msg of step.response.messages) {
      messages.push(msg);
    }
  }
};
