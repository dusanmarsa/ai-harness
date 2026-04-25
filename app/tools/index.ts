import type { ChatCompletionToolMessageParam } from "openai/resources";
import {
  findFilesToolDefinition,
  findFilesToolFunction,
  findFilesToolFunctionArgsSchema,
} from "./findFiles";
import {
  readFileToolDefinition,
  readFileToolFunction,
  readFileToolFunctionArgsSchema,
} from "./readFile";
import { ZodError } from "zod";

export const tools = [
  findFilesToolDefinition,
  readFileToolDefinition
];

const parseJsonArgs = (args: string) => {
  try {
    return JSON.parse(args ?? "");
  } catch (error) {
    return null;
  }
};

const createToolErrorMessage = (toolCallId: string, error: ZodError) => {
  return {
    role: "tool",
    tool_call_id: toolCallId,
    content: [
      {
        type: "text",
        text: `Error parsing arguments: ${error.message}`,
      },
    ],
  } satisfies ChatCompletionToolMessageParam;
};

const createToolSuccessMessage = (toolCallId: string, content: string) => {
  return {
    role: "tool",
    tool_call_id: toolCallId,
    content: [
      {
        type: "text",
        text: content,
      },
    ],
  } satisfies ChatCompletionToolMessageParam;
};

export const processToolCall = async (
  toolCallId: string,
  toolName: string,
  toolArgs: string,
  options?: { onLog?: (message: string) => void },
) => {
  const log = options?.onLog ?? ((m: string) => console.log(m));

  switch (toolName) {
    case "readFile": {
      const { success, data, error } = readFileToolFunctionArgsSchema.safeParse(
        parseJsonArgs(toolArgs),
      );

      if (!success) {
        return createToolErrorMessage(toolCallId, error);
      }

      log(`Reading file: ${data.filePath}`);

      const fileContent = await readFileToolFunction(data.filePath);

      return createToolSuccessMessage(toolCallId, fileContent);
    }
    case "findFiles": {
      const { success, data, error } =
        findFilesToolFunctionArgsSchema.safeParse(parseJsonArgs(toolArgs));

      if (!success) {
        return createToolErrorMessage(toolCallId, error);
      }

      log(`Finding files: ${data.query}`);

      const listing = await findFilesToolFunction(data.query);

      return createToolSuccessMessage(toolCallId, listing);
    }
    default: {
      return createToolErrorMessage(
        toolCallId,
        new ZodError([
          {
            code: "custom",
            path: [],
            message: `Unknown tool call: ${toolName}`,
          },
        ]),
      );
    }
  }
};
