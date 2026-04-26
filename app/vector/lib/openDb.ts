import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { Database } from "bun:sqlite";
import {
  BREW_PREFIX_SQLITE,
  COL_TEXT_BODY,
  COL_TEXT_EMBEDDING,
  COL_TEXT_END_LINE,
  COL_TEXT_ID,
  COL_TEXT_PATH,
  COL_TEXT_START_LINE,
  DARWIN_HOMEBREW_SQLITE,
  TABLE_INDEX_META,
  TABLE_TEXT_CHUNKS,
  VECTOR_DISTANCE_COSINE,
  VECTOR_TYPE_FLOAT32,
} from "../constants";
import { defaultVendorVectorPath } from "../utils";

export type OpenVectorDbOptions = {
  dbPath: string;
  /** Path to sqlite-vector native library (vector.dylib / vector.so / vector.dll) */
  extensionPath?: string;
  /** FLOAT32 embedding length; must match index and OpenAI `dimensions` */
  dimensions: number;
  /** macOS: Homebrew sqlite lib, e.g. /opt/homebrew/opt/sqlite/lib/libsqlite3.dylib — required for load_extension on many macOS builds */
  customSqliteLib?: string;
  readonly?: boolean;
};

export const resolveExtensionPath = (explicit?: string): string => {
  if (explicit) {
    return explicit;
  }

  return defaultVendorVectorPath();
};

/**
 * `.env` does not run the shell, so values like
 * `$(brew --prefix sqlite)/lib/libsqlite3.dylib` are passed as literal text.
 * Expand that pattern to a real path when `brew` is available.
 */
export const expandDarwinBrewInPath = (value: string): string => {
  if (process.platform !== "darwin" || !value.includes("$(brew")) {
    return value.trim();
  }

  BREW_PREFIX_SQLITE.lastIndex = 0;

  if (!BREW_PREFIX_SQLITE.test(value)) {
    return value.trim();
  }

  try {
    const prefix = execFileSync("brew", ["--prefix", "sqlite"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();

    if (!prefix) {
      return value.trim();
    }

    BREW_PREFIX_SQLITE.lastIndex = 0;

    return value.replace(BREW_PREFIX_SQLITE, prefix).trim();
  } catch {
    return value.trim();
  }
}

export const homebrewSqliteFromPrefix = (): string | undefined => {
  try {
    const prefix = execFileSync("brew", ["--prefix", "sqlite"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();

    if (!prefix) {
      return undefined;
    }

    const lib = join(prefix, "lib", "libsqlite3.dylib");

    return existsSync(lib) ? lib : undefined;
  } catch {
    return undefined;
  }
};

/**
 * On macOS, Bun links to a libsqlite3 that often has extension loading disabled.
 * `Database.setCustomSQLite` must use Homebrew (or another) build that supports
 * `sqlite3_load_extension` — and it must be set before the first `Database` construct.
 */
export const resolveCustomSqliteLib = (
  fromOptions: string | undefined
): string | undefined => {
  const fromEnv = fromOptions ?? process.env.SQLITE3_DYLIB ?? process.env.BUN_CUSTOM_SQLITELIB;

  if (fromEnv) {
    const candidate =
      process.platform === "darwin" ? expandDarwinBrewInPath(fromEnv) : fromEnv.trim();

    if (existsSync(candidate)) {
      return candidate;
    }
  }

  if (process.platform !== "darwin") {
    return undefined;
  }

  for (const p of DARWIN_HOMEBREW_SQLITE) {
    if (existsSync(p)) {
      return p;
    }
  }

  return homebrewSqliteFromPrefix();
};

export const applyCustomSqliteOnDarwin = (sqliteLib: string | undefined): void => {
  if (process.platform !== "darwin" || !sqliteLib) {
    return;
  }

  Database.setCustomSQLite(sqliteLib);
};

/**
 * Opens the DB, loads sqlite-vector, runs `vector_init` for the chunks table embedding.
 * Call `prepareVectorSearch` after inserts or on a fresh connection before search.
 */
export const openVectorDatabase = (options: OpenVectorDbOptions): Database => {
  const extPath = resolveExtensionPath(options.extensionPath);

  if (!existsSync(extPath)) {
    throw new Error(
      `sqlite-vector native library not found at ${extPath}.\n` +
        `Run: bun run vector:download\n` +
        `Or set SQLITE_VECTOR_EXTENSION to the full path of vector.dylib / vector.so / vector.dll.`
    );
  }

  const sqliteLib = resolveCustomSqliteLib(options.customSqliteLib);

  applyCustomSqliteOnDarwin(sqliteLib);

  const db = new Database(options.dbPath, {
    readonly: options.readonly ?? false,
    create: !options.readonly,
  });

  try {
    db.loadExtension(extPath);
  } catch (e) {
    const msg = String(e);
    const isNoExt = msg.includes("does not support dynamic extension loading");

    const hint =
      process.platform === "darwin" && isNoExt
        ? "\nOn macOS, install a sqlite build that allows extensions, then re-run (or set SQLITE3_DYLIB to the real .dylib path). “$(brew --prefix …)” in .env is not expanded by the shell; the harness rewrites the common `$(brew --prefix sqlite)/lib/libsqlite3.dylib` form at runtime when `brew` is on PATH. Otherwise: `brew install sqlite` and use an absolute path, e.g. /opt/homebrew/opt/sqlite/lib/libsqlite3.dylib."
        : "";

    throw new Error(
      `Failed to load sqlite-vector from ${extPath}: ${e}${hint}`
    );
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS ${TABLE_INDEX_META} (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS ${TABLE_TEXT_CHUNKS} (
      ${COL_TEXT_ID} INTEGER PRIMARY KEY AUTOINCREMENT,
      ${COL_TEXT_PATH} TEXT NOT NULL,
      ${COL_TEXT_START_LINE} INTEGER NOT NULL,
      ${COL_TEXT_END_LINE} INTEGER NOT NULL,
      ${COL_TEXT_BODY} TEXT NOT NULL,
      ${COL_TEXT_EMBEDDING} BLOB NOT NULL
    );
  `);

  const vectorOpts = `type=${VECTOR_TYPE_FLOAT32},dimension=${options.dimensions},distance=${VECTOR_DISTANCE_COSINE}`;

  db.run(
    `SELECT vector_init('${TABLE_TEXT_CHUNKS}', '${COL_TEXT_EMBEDDING}', ?);`,
    [vectorOpts]
  );

  return db;
};

/** Call after changing the chunks table (full reindex or inserts). */
export const rebuildVectorIndex = (db: Database): void => {
  db.run(
    `SELECT vector_quantize('${TABLE_TEXT_CHUNKS}', '${COL_TEXT_EMBEDDING}');`
  );
  db.run(
    `SELECT vector_quantize_preload('${TABLE_TEXT_CHUNKS}', '${COL_TEXT_EMBEDDING}');`
  );
};

/**
 * After opening an existing on-disk index (e.g. for search), load quantized data
 * for fast `vector_quantize_scan` (quantization is stored in the DB file).
 */
export const preloadVectorIndex = (db: Database): void => {
  try {
    db.run(
      `SELECT vector_quantize_preload('${TABLE_TEXT_CHUNKS}', '${COL_TEXT_EMBEDDING}');`
    );
  } catch {
    /* empty DB or no quantization yet */
  }
}
