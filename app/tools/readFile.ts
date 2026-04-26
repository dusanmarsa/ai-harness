import { tool, type Tool } from "ai";
import { z } from "zod";

type Parameters = {
  onLog?: (message: string) => void;
};

export default (options: Parameters): Tool => tool({
  description: "Read the contents of a file",
  inputSchema: z.object({
    filePath: z.string().describe("The path to the file to read"),
  }),
  execute: async ({ filePath }) => {
    options.onLog?.(`Reading file: ${filePath}`);
    const fileContent = await Bun.file(filePath).text();
    return fileContent;
  },
});
