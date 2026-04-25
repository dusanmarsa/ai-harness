import type { ChatCompletionTool, FunctionDefinition } from "openai/resources";
import { z } from "zod";

export const readFileToolFunction = async (filePath: string) => {
  const fileContent = await Bun.file(filePath).text();
  return fileContent;
};

export const readFileToolFunctionArgsSchema = z.object({
  filePath: z.string().describe("The path to the file to read"),
}).strict();

export const readFileToolDefinition = {
  type: "function",
  function: {
    name: "readFile",
    description: "Read the contents of a file",
    parameters: readFileToolFunctionArgsSchema.toJSONSchema(),
  }
} satisfies ChatCompletionTool;
