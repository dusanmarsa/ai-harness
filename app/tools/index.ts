import { tool, type ToolSet } from "ai";

import readFileTool from "./readFile";
import findFilesTool from "./findFiles";
import semanticSearchTool from "./semanticSearch";
import writeTool from "./write";

export const createModelTools = (options?: {
  onLog?: (message: string) => void;
}): ToolSet => {
  const log = options?.onLog ?? (() => {});

  return {
    Read: readFileTool({ onLog: log }),
    Find: findFilesTool({ onLog: log }),
    Write: writeTool({ onLog: log }),
    SemanticSearch: semanticSearchTool({ onLog: log }),
  };
};
