import {
  CODE_EMBED_DIR_NAME,
  COL_INDEX_META_KEY,
  COL_INDEX_META_VALUE,
  DEFAULT_VECTOR_DB_FILENAME,
  IGNORE_DIRS,
  IGNORE_FILE_NAMES,
  SQLITE_VECTOR_VENDOR_DIR_NAME,
  TABLE_INDEX_META,
  VECTOR_EXT_DARWIN,
  VECTOR_EXT_UNIX,
  VECTOR_EXT_WIN32,
  VENDOR_DIR_NAME,
} from "./constants";
import { join } from "node:path";
import type { Database } from "bun:sqlite";

export const getMeta = (db: Database, key: string): string | undefined => {
  const row = db
    .query(
      `SELECT ${COL_INDEX_META_VALUE} FROM ${TABLE_INDEX_META} WHERE ${COL_INDEX_META_KEY} = ?`
    )
    .get(key) as { value: string } | undefined;
  return row?.value;
};

export const setMeta = (db: Database, key: string, value: string): void => {
  db.run(
    `INSERT OR REPLACE INTO ${TABLE_INDEX_META} (${COL_INDEX_META_KEY}, ${COL_INDEX_META_VALUE}) VALUES (?, ?)`,
    [key, value]
  );
};

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
    return VECTOR_EXT_DARWIN;
  }

  if (process.platform === "win32") {
    return VECTOR_EXT_WIN32;
  }

  return VECTOR_EXT_UNIX;
};

export const defaultVendorVectorPath = (
  cwd: string = process.cwd(),
): string => {
  return join(
    cwd,
    VENDOR_DIR_NAME,
    SQLITE_VECTOR_VENDOR_DIR_NAME,
    defaultVectorLibraryFilename()
  );
};

export const defaultDatabasePath = (cwd: string = process.cwd()): string => {
  return join(cwd, CODE_EMBED_DIR_NAME, DEFAULT_VECTOR_DB_FILENAME);
};
