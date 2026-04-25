import type { ChatCompletionTool } from "openai/resources";
import { readdir } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { z } from "zod";

const IGNORE_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".cursor",
  "coverage",
  ".next",
  "out",
]);

const MAX_RESULTS = 100;

function normalizeSeparators(p: string): string {
  return p.split(sep).join("/");
}

function shouldMatch(
  relPath: string,
  fileName: string,
  query: string
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) {
    return false;
  }
  const nameLower = fileName.toLowerCase();
  const relLower = normalizeSeparators(relPath).toLowerCase();

  if (q.startsWith(".") && q.length > 1) {
    return nameLower.endsWith(q);
  }

  return nameLower.includes(q) || relLower.includes(q);
}

async function walk(
  rootDir: string,
  dir: string,
  query: string,
  results: string[]
): Promise<void> {
  if (results.length >= MAX_RESULTS) {
    return;
  }
  const entries = await readdir(dir, { withFileTypes: true });
  for (const ent of entries) {
    if (results.length >= MAX_RESULTS) {
      return;
    }
    const full = join(dir, ent.name);
    if (ent.isDirectory()) {
      if (IGNORE_DIRS.has(ent.name)) {
        continue;
      }
      await walk(rootDir, full, query, results);
    } else if (ent.isFile()) {
      const rel = relative(rootDir, full);
      if (shouldMatch(rel, ent.name, query)) {
        results.push(normalizeSeparators(rel));
      }
    }
  }
}

export async function findFilesToolFunction(
  query: string,
  rootDir: string = process.cwd()
): Promise<string> {
  const results: string[] = [];
  await walk(rootDir, rootDir, query, results);
  results.sort();
  if (results.length === 0) {
    return "No files found matching the query.";
  }
  if (results.length >= MAX_RESULTS) {
    return (
      results.join("\n") +
      `\n\n(results capped at ${MAX_RESULTS}; use a more specific query)`
    );
  }
  return results.join("\n");
}

export const findFilesToolFunctionArgsSchema = z
  .object({
    query: z
      .string()
      .min(1)
      .describe(
        "Fragment to match: part of a file or path (e.g. main, readfile, tools), or a leading-dot extension (e.g. .ts) to filter by file extension"
      ),
  })
  .strict();

export const findFilesToolDefinition = {
  type: "function",
  function: {
    name: "findFiles",
    description:
      "Search the workspace for file paths that match a partial name, path segment, or extension. Names are matched case-insensitively (e.g. 'readfile' matches readFile.ts).",
    parameters: findFilesToolFunctionArgsSchema.toJSONSchema(),
  },
} satisfies ChatCompletionTool;
