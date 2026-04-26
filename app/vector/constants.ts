/**
 * Directories and file basenames to skip when walking a repo for indexing.
 */
export const IGNORE_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".cursor",
  "coverage",
  ".next",
  "out",
  "vendor",
  ".code-embed",
]);

export const IGNORE_FILE_NAMES = new Set([
  ".env",
  ".env.local",
  ".env.development",
  ".env.production",
  ".env.test",
  "bun.lockb",
]);

// ——— CLI & embedding defaults ———

export const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";
export const DEFAULT_EMBEDDING_DIMENSIONS = 512;
export const DEFAULT_TOP_K = 8;
export const SEARCH_HIT_BODY_PREVIEW_CHARS = 600;

// ——— Chunking & OpenAI embed batching ———

export const CHUNK_MAX_CHARS = 4_000;
export const EMBED_BATCH_SIZE = 64;

// ——— On-disk layout (default DB & sqlite-vector binary) ———

export const CODE_EMBED_DIR_NAME = ".code-embed";
export const DEFAULT_VECTOR_DB_FILENAME = "codebase.sqlite";
export const VENDOR_DIR_NAME = "vendor";
export const SQLITE_VECTOR_VENDOR_DIR_NAME = "sqlite-vector";

export const VECTOR_EXT_DARWIN = "vector.dylib";
export const VECTOR_EXT_WIN32 = "vector.dll";
export const VECTOR_EXT_UNIX = "vector.so";

// ——— macOS: Homebrew libsqlite3 candidates (extension loading) ———

export const DARWIN_HOMEBREW_SQLITE: readonly string[] = [
  "/opt/homebrew/opt/sqlite/lib/libsqlite3.dylib",
  "/usr/local/opt/sqlite/lib/libsqlite3.dylib",
];

/** Matches `$(brew --prefix sqlite)` in paths from `.env` (no shell expansion). */
export const BREW_PREFIX_SQLITE = /\$\(\s*brew\s+--prefix\s+sqlite\s*\)/g;

// ——— SQLite: vector store schema ———

export const TABLE_INDEX_META = "index_meta";
export const COL_INDEX_META_KEY = "key";
export const COL_INDEX_META_VALUE = "value";

export const TABLE_TEXT_CHUNKS = "text_chunks";
export const COL_TEXT_ID = "id";
export const COL_TEXT_PATH = "path";
export const COL_TEXT_START_LINE = "start_line";
export const COL_TEXT_END_LINE = "end_line";
export const COL_TEXT_BODY = "body";
export const COL_TEXT_EMBEDDING = "embedding";

/** Keys in `index_meta` written by the indexer. */
export const META_KEY_DIMENSIONS = "dimensions";
export const META_KEY_EMBEDDING_MODEL = "embedding_model";
export const META_KEY_ROOT = "root";
export const META_KEY_INDEXED_AT = "indexed_at";

// ——— sqlite-vector `vector_init` options ———

export const VECTOR_TYPE_FLOAT32 = "FLOAT32";
export const VECTOR_DISTANCE_COSINE = "COSINE";
