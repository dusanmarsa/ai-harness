import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { Database } from "bun:sqlite";
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

function resolveExtensionPath(explicit?: string): string {
  if (explicit) {
    return explicit;
  }
  return defaultVendorVectorPath();
}

const DARWIN_HOMEBREW_SQLITE: readonly string[] = [
  "/opt/homebrew/opt/sqlite/lib/libsqlite3.dylib",
  "/usr/local/opt/sqlite/lib/libsqlite3.dylib",
];

const BREW_PREFIX_SQLITE = /\$\(\s*brew\s+--prefix\s+sqlite\s*\)/g;

/**
 * `.env` does not run the shell, so values like
 * `$(brew --prefix sqlite)/lib/libsqlite3.dylib` are passed as literal text.
 * Expand that pattern to a real path when `brew` is available.
 */
function expandDarwinBrewInPath(value: string): string {
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

function homebrewSqliteFromPrefix(): string | undefined {
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
}

/**
 * On macOS, Bun links to a libsqlite3 that often has extension loading disabled.
 * `Database.setCustomSQLite` must use Homebrew (or another) build that supports
 * `sqlite3_load_extension` — and it must be set before the first `Database` construct.
 */
function resolveCustomSqliteLib(
  fromOptions: string | undefined
): string | undefined {
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
}

function applyCustomSqliteOnDarwin(sqliteLib: string | undefined): void {
  if (process.platform !== "darwin" || !sqliteLib) {
    return;
  }
  Database.setCustomSQLite(sqliteLib);
}

/**
 * Opens the DB, loads sqlite-vector, runs `vector_init` for `code_chunks.embedding`.
 * Call `prepareVectorSearch` after inserts or on a fresh connection before search.
 */
export function openVectorDatabase(options: OpenVectorDbOptions): Database {
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
    CREATE TABLE IF NOT EXISTS index_meta (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS code_chunks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT NOT NULL,
      start_line INTEGER NOT NULL,
      end_line INTEGER NOT NULL,
      body TEXT NOT NULL,
      embedding BLOB NOT NULL
    );
  `);

  const vectorOpts = `type=FLOAT32,dimension=${options.dimensions},distance=COSINE`;
  db.run(`SELECT vector_init('code_chunks', 'embedding', ?);`, [vectorOpts]);

  return db;
}

/** Call after changing `code_chunks` (full reindex or inserts). */
export function rebuildVectorIndex(db: Database): void {
  db.run(`SELECT vector_quantize('code_chunks', 'embedding');`);
  db.run(`SELECT vector_quantize_preload('code_chunks', 'embedding');`);
}

/**
 * After opening an existing on-disk index (e.g. for search), load quantized data
 * for fast `vector_quantize_scan` (quantization is stored in the DB file).
 */
export function preloadVectorIndex(db: Database): void {
  try {
    db.run(`SELECT vector_quantize_preload('code_chunks', 'embedding');`);
  } catch {
    /* empty DB or no quantization yet */
  }
}
