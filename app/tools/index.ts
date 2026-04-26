import type { ChatCompletionToolMessageParam } from "openai/resources";
import { ZodError } from "zod";

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


import {
  semanticSearchToolDefinition,
  semanticSearchToolFunction,
  semanticSearchToolFunctionArgsSchema,
} from "./semanticSearch";

import {
  writeToolDefinition,
  writeToolFunction,
  writeToolFunctionArgsSchema,
} from "./write";

export const tools = [
  findFilesToolDefinition,
  readFileToolDefinition,
  semanticSearchToolDefinition,
  writeToolDefinition,
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

      log(`Read: ${data.filePath}`);

      const fileContent = await readFileToolFunction(data.filePath);

      return createToolSuccessMessage(toolCallId, fileContent);
    }
    case "findFiles": {
      const { success, data, error } =
        findFilesToolFunctionArgsSchema.safeParse(parseJsonArgs(toolArgs));

      if (!success) {
        return createToolErrorMessage(toolCallId, error);
      }

      log(`Exploring: ${data.query}`);

      const listing = await findFilesToolFunction(data.query);

      return createToolSuccessMessage(toolCallId, listing);
    }
    case "Write": {
      const { success, data, error } =
        writeToolFunctionArgsSchema.safeParse(parseJsonArgs(toolArgs));

      if (!success) {
        return createToolErrorMessage(toolCallId, error);
      }

      log(`Write: ${data.filePath}`);

      await writeToolFunction(data.filePath, data.content);

      return createToolSuccessMessage(toolCallId, `Content of ${data.filePath} updated.`);
    }
    case "semanticSearch": {
      const { success, data, error } =
        semanticSearchToolFunctionArgsSchema.safeParse(parseJsonArgs(toolArgs));

      if (!success) {
        return createToolErrorMessage(toolCallId, error);
      }

      log(`Search: ${data.query}`);

      const text = await semanticSearchToolFunction(data.query, data.topK);

      return createToolSuccessMessage(toolCallId, text);
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
