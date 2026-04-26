import { readdir } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { shouldIgnoreFileName, shouldIgnoreDirName } from "../utils";

export type WalkedFile = { absPath: string; relPath: string };

/**
 * Recursively list text/code files under `root` with paths relative to `root` (forward slashes).
 */
export const walkCodebase = async (root: string): Promise<WalkedFile[]> => {
  const out: WalkedFile[] = [];

  const walk = async (dir: string): Promise<void> => {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const ent of entries) {
      const full = join(dir, ent.name);

      if (ent.isDirectory()) {
        if (shouldIgnoreDirName(ent.name)) {
          continue;
        }

        await walk(full);
      } else if (ent.isFile()) {
        if (shouldIgnoreFileName(ent.name)) {
          continue;
        }

        const rel = relative(root, full);

        out.push({
          absPath: full,
          relPath: rel.split(sep).join("/"),
        });
      }
    }
  };

  await walk(root);

  out.sort((a, b) => a.relPath.localeCompare(b.relPath));

  return out;
};
