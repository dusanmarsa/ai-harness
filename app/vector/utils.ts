import { IGNORE_DIRS, IGNORE_FILE_NAMES } from "./constants";
import { join } from "node:path";
import type { Database } from "bun:sqlite";

export const getMeta = (db: Database, key: string): string | undefined => {
  const row = db
    .query(`SELECT value FROM index_meta WHERE key = ?`)
    .get(key) as { value: string } | undefined;
  return row?.value;
}

export const setMeta = (db: Database, key: string, value: string): void => {
  db.run(`INSERT OR REPLACE INTO index_meta (key, value) VALUES (?, ?)`, [
    key,
    value,
  ]);
}

export const shouldIgnoreFileName = (name: string): boolean => {
  if (IGNORE_FILE_NAMES.has(name)) {
    return true;
  }

  return false;
};

export const shouldIgnoreDirName = (name: string): boolean => {
  return IGNORE_DIRS.has(name);
};

export const defaultVectorLibraryFilename = (): string => {
  if (process.platform === "darwin") {
    return "vector.dylib";
  }

  if (process.platform === "win32") {
    return "vector.dll";
  }

  return "vector.so";
};

export const defaultVendorVectorPath = (
  cwd: string = process.cwd(),
): string => {
  return join(cwd, "vendor", "sqlite-vector", defaultVectorLibraryFilename());
};

export const defaultDatabasePath = (cwd: string = process.cwd()): string => {
  return join(cwd, ".code-embed", "codebase.sqlite");
};
