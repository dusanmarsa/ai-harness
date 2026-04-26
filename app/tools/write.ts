import { tool, type Tool } from "ai";
import { z } from "zod";

type Parameters = {
  onLog?: (message: string) => void;
};

export default (options: Parameters): Tool => tool({
  description: "Write content to a file",
  inputSchema: z.object({
    filePath: z.string().describe("The path of the file to write to"),
    content: z.string().describe("The content to write to the file"),
    }),
    execute: async ({ filePath, content }) => {
      options.onLog?.(`Writing file: ${filePath}`);
      await Bun.file(filePath).write(content);
      return `Content written to ${filePath}`;
    },
  });
