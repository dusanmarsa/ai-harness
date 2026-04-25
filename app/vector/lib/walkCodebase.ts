import { readdir } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { IGNORE_DIRS } from "./ignoreDirs";
import { isCodeFile } from "./codeExtensions";
import { shouldIgnoreFileName } from "./ignoreFiles";

export type WalkedFile = { absPath: string; relPath: string };

/**
 * Recursively list text/code files under `root` with paths relative to `root` (forward slashes).
 */
export async function walkCodebase(
  root: string
): Promise<WalkedFile[]> {
  const out: WalkedFile[] = [];

  async function walk(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const ent of entries) {
      const full = join(dir, ent.name);
      if (ent.isDirectory()) {
        if (IGNORE_DIRS.has(ent.name)) {
          continue;
        }
        await walk(full);
      } else if (
        ent.isFile() &&
        !shouldIgnoreFileName(ent.name) &&
        isCodeFile(ent.name)
      ) {
        const rel = relative(root, full);
        out.push({
          absPath: full,
          relPath: rel.split(sep).join("/"),
        });
      }
    }
  }

  await walk(root);
  out.sort((a, b) => a.relPath.localeCompare(b.relPath));
  return out;
}
