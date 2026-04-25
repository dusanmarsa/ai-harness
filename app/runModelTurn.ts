import OpenAI from "openai";
import type {
  ChatCompletionAssistantMessageParam,
  ChatCompletionMessageParam,
} from "openai/resources";
import { processToolCall, tools } from "./tools";

export const DEFAULT_SYSTEM_CONTENT =
  "You are a helpful assistant that can answer questions and help with tasks.";

export function createInitialMessages(
  firstUserMessage?: string,
): ChatCompletionMessageParam[] {
  const base: ChatCompletionMessageParam[] = [
    { role: "system", content: DEFAULT_SYSTEM_CONTENT },
  ];
  if (firstUserMessage) {
    base.push({ role: "user", content: firstUserMessage });
  }
  return base;
}

export function getLastAssistantText(
  messages: ChatCompletionMessageParam[],
): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "assistant") continue;
    const c = m.content;
    if (typeof c === "string" && c.length > 0) {
      return c;
    }
  }
  return null;
}

export type RunModelTurnOptions = {
  onToolLog?: (message: string) => void;
};

export async function runModelTurn(
  client: OpenAI,
  messages: ChatCompletionMessageParam[],
  options?: RunModelTurnOptions,
): Promise<void> {
  const { onToolLog } = options ?? {};
  let shouldContinue = true;

  while (shouldContinue) {
    const response = await client.chat.completions.create({
      model: "gpt-4",
      messages,
      tools,
    });

    const choice = response.choices[0];
    if (!choice) {
      throw new Error("No response choice from the model");
    }

    const msg = choice.message;
    messages.push({
      role: "assistant",
      content: msg.content,
      tool_calls: msg.tool_calls,
    } satisfies ChatCompletionAssistantMessageParam);

    if (choice.finish_reason === "stop") {
      shouldContinue = false;
      break;
    }

    if (choice.finish_reason === "tool_calls") {
      const toolType = msg.tool_calls?.[0]?.type;
      const toolCallId = msg.tool_calls?.[0]?.id ?? "";

      if (toolType === "function") {
        const toolFn = msg.tool_calls?.[0]?.function;
        const { name, arguments: args } = toolFn ?? {};

        if (!name || args === undefined) {
          continue;
        }

        const toolResult = await processToolCall(
          toolCallId,
          name,
          args,
          { onLog: onToolLog },
        );
        messages.push(toolResult);
      }
    } else {
      shouldContinue = false;
    }
  }
}
