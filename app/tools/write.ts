import type { ChatCompletionTool } from "openai/resources";
import { z } from "zod";

export const writeToolFunction = async (filePath: string, content: string): Promise<void> => {
  await Bun.file(filePath).write(content);
};

export const writeToolFunctionArgsSchema = z.object({
  filePath: z.string().describe("The path of the file to write to"),
  content: z.string().describe("The content to write to the file"),
}).strict();

export const writeToolDefinition = {
  type: "function",
  function: {
    name: "Write",
    description: "Write content to a file",
    parameters: writeToolFunctionArgsSchema.toJSONSchema(),
  }
} satisfies ChatCompletionTool;
