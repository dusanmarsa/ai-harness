import { z } from "zod";
import { defaultDatabasePath } from "../vector/utils";
import { searchCodebase, type SearchHit } from "../vector/lib/searchRepo";
import { tool, type Tool } from "ai";

const DEFAULT_MODEL = "text-embedding-3-small";
const DEFAULT_DIMS = 512;

function formatHit(hit: SearchHit, i: number): string {
  const head = `${i + 1}. ${hit.path} (lines ${hit.startLine}–${hit.endLine})  distance=${hit.distance}`;
  const preview =
    hit.body.length > 600 ? `${hit.body.slice(0, 600)}…` : hit.body;
  return `${head}\n${preview}`;
}

/**
 * Vector similarity search over the pre-built index (see `bun run vector:index`).
 * Uses the same env as the vector CLI: VECTOR_DB, EMBEDDING_*, SQLITE_VECTOR_EXTENSION, SQLITE3_DYLIB.
 */
export async function semanticSearchToolFunction(
  query: string,
  topK: number,
): Promise<string> {
  const apiKey = process.env.OPEN_AI_API_KEY;
  if (!apiKey) {
    return "Error: OPEN_AI_API_KEY is not set.";
  }

  const dbPath = process.env.VECTOR_DB ?? defaultDatabasePath(process.cwd());
  const embeddingModel = process.env.EMBEDDING_MODEL ?? DEFAULT_MODEL;
  const dimensions = Number(
    process.env.EMBEDDING_DIMENSIONS ?? String(DEFAULT_DIMS),
  );
  if (!Number.isFinite(dimensions) || dimensions < 1) {
    return "Error: invalid EMBEDDING_DIMENSIONS.";
  }

  try {
    const hits = await searchCodebase({
      dbPath,
      query,
      openAiKey: apiKey,
      embeddingModel,
      dimensions,
      topK,
      extensionPath: process.env.SQLITE_VECTOR_EXTENSION,
      customSqliteLib:
        process.env.SQLITE3_DYLIB ?? process.env.BUN_CUSTOM_SQLITELIB,
    });

    if (hits.length === 0) {
      return (
        "No semantic search results. The index may be empty or the query matched nothing. " +
        "Build or refresh the index with: bun run vector:index"
      );
    }

    return hits.map((h, i) => formatHit(h, i)).join("\n\n");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return `Semantic search failed: ${msg}`;
  }
}

export const semanticSearchToolFunctionArgsSchema = z.object({
  query: z
    .string()
    .min(1)
    .describe(
      "Natural-language description of what to find in the codebase (meaning and intent, not a file path)",
    ),
  topK: z
    .number()
    .int()
    .min(1)
    .max(20)
    .optional()
    .default(8)
    .describe("How many matching chunks to return (default 8)"),
});

type Parameters = {
  onLog?: (message: string) => void;
};

export default (options: Parameters): Tool =>
  tool({
    description:
      "Search the codebase by meaning using the local vector index. Use for conceptual questions (how X works, where Y is configured) after the repo has been indexed with `bun run vector:index`. For file name or path fragments, use findFiles instead.",
    inputSchema: semanticSearchToolFunctionArgsSchema,
    execute: async ({ query, topK }) => {
      options.onLog?.(`Semantic searching: ${query}`);
      return semanticSearchToolFunction(query, topK ?? 8);
    },
  });
