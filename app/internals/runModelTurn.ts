import { createOpenAI } from "@ai-sdk/openai";
import type { AssistantModelMessage, ModelMessage } from "ai";
import { stepCountIs, streamText } from "ai";

import { createModelTools } from "../tools";
import { SYSTEM_PROMPT } from "./constants";

const openaiProvider = createOpenAI({
  apiKey: process.env.OPEN_AI_API_KEY ?? process.env.OPENAI_API_KEY,
});

const chatModel = openaiProvider("gpt-4.1");

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

  const result = streamText({
    model: chatModel,
    system: SYSTEM_PROMPT,
    messages,
    tools,
    stopWhen: stepCountIs(20),
    onChunk: ({ chunk }) => {
      if (chunk.type === "text-delta") {
        onChunk?.(chunk.text);
      }
    },
  });

  await result.consumeStream();

  const { messages: newMessages } = await result.response;
  for (const msg of newMessages) {
    messages.push(msg);
  }
};
