import OpenAI from "openai";
import type {
  ChatCompletionAssistantMessageParam,
  ChatCompletionMessageParam,
} from "openai/resources";
import { processToolCall, tools } from "../tools";

export const DEFAULT_SYSTEM_CONTENT =
  "You are a helpful assistant that can answer questions and help with tasks.";

export const createMessagesArray = (
  firstUserMessage?: string,
): ChatCompletionMessageParam[] => {
  const base: ChatCompletionMessageParam[] = [
    { role: "system", content: DEFAULT_SYSTEM_CONTENT },
  ];

  if (firstUserMessage) {
    base.push({ role: "user", content: firstUserMessage });
  }

  return base;
};

export const getLastAssistantMessage = (
  messages: ChatCompletionMessageParam[],
): ChatCompletionAssistantMessageParam | null => {
  let lastAssistantMessageContent: ChatCompletionAssistantMessageParam | null = null;

  for (const m of messages) { 
    if (m.role === "assistant") {
      lastAssistantMessageContent = m satisfies ChatCompletionAssistantMessageParam;
    }
  }

  return lastAssistantMessageContent;
};

export type RunModelTurnOptions = {
  onToolLog?: (message: string) => void;
};

export const runModelTurn = async (
  messages: ChatCompletionMessageParam[],
  options?: RunModelTurnOptions,
): Promise<void> => {
  const client = new OpenAI({ apiKey: process.env.OPEN_AI_API_KEY });

  const { onToolLog } = options ?? {};

  let shouldContinue = true;

  while (shouldContinue) {
    const response = await client.chat.completions.create({
      model: "gpt-4",
      messages,
      tools,
    });

    const choice = response.choices?.[0];

    if (!choice) {
      throw new Error("No response choice from the model");
    }

    const msg = choice.message;
    
    if (!msg) {
      throw new Error("No message from the model");
    }

    messages.push({
      role: "assistant",
      content: msg.content,
      tool_calls: msg.tool_calls,
    } satisfies ChatCompletionAssistantMessageParam);

    if (choice.finish_reason === "stop" || !msg.tool_calls) {
      shouldContinue = false;
      break;
    }

    if (choice.finish_reason === "tool_calls") {
      const toolCall = msg.tool_calls?.[0];

      const toolType = toolCall?.type;
      const toolCallId = toolCall?.id;

      if (!toolCallId || !toolType) {
        throw new Error("No tool call id or type from the model");
      }

      if (toolType === "function") {
        const toolFn = toolCall?.function;
        const { name, arguments: args } = toolFn ?? {};

        if (!name || args === undefined) {
          continue;
        }

        const toolResult = await processToolCall(toolCallId, name, args, {
          onLog: onToolLog,
        });

        if (!toolResult) {
          throw new Error("No tool result from the model");
        }

        messages.push(toolResult);
      }
    }
  }
}
