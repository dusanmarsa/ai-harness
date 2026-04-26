import { tool, type Tool } from "ai";
import { spawn } from "node:child_process";
import { z } from "zod";

type Parameters = {
  onLog?: (message: string) => void;
};

const bashTool = (options: Parameters): Tool =>
  tool({
    description:
      "Run a bash command in a subprocess and get stdout/stderr output",
    inputSchema: z.object({
      command: z.string().describe("The bash command to execute"),
    }),
    execute: async ({ command }) => {
      options.onLog?.(`Running bash command: ${command}`);

      return new Promise((resolve) => {
        const child = spawn(command, { shell: true });
        let stdout = "";
        let stderr = "";

        child.stdout.on("data", (data) => {
          stdout += data.toString();
        });

        child.stderr.on("data", (data) => {
          stderr += data.toString();
        });

        child.on("close", (code) => {
          resolve({ stdout, stderr, code });
        });
      });
    },
  });

export default bashTool;
