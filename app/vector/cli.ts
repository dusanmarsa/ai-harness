import {
  DEFAULT_EMBEDDING_DIMENSIONS,
  DEFAULT_EMBEDDING_MODEL,
  DEFAULT_TOP_K,
  SEARCH_HIT_BODY_PREVIEW_CHARS,
} from "./constants";
import { defaultDatabasePath } from "./utils";
import { indexCodebase } from "./lib/indexRepo";
import { searchCodebase, type SearchHit } from "./lib/searchRepo";

const usage = (): never => {
  console.error(`Usage:
  bun --env-file=.env run app/vector/cli.ts index [--root <dir>] [--db <path>]
  bun --env-file=.env run app/vector/cli.ts search [--db <path>] [--top <n>] <query...>

Environment:
  OPEN_AI_API_KEY   required for index and search
  CODEBASE_ROOT     default: current directory
  VECTOR_DB         SQLite path (default: <cwd>/.code-embed/codebase.sqlite)
  EMBEDDING_MODEL   default: ${DEFAULT_EMBEDDING_MODEL}
  EMBEDDING_DIMENSIONS  default: ${String(DEFAULT_EMBEDDING_DIMENSIONS)}
  SQLITE_VECTOR_EXTENSION  path to vector.dylib / vector.so / vector.dll (or use vendor/ after download)
  SQLITE3_DYLIB     macOS: path to libsqlite3.dylib from Homebrew (extensions often disabled on Apple sqlite)

Scripts:
  bun run vector:download   fetch sqlite-vector for this OS/arch into vendor/sqlite-vector/
`);
  process.exit(1);
}

type ParsedFlags = {
  root: string;
  dbPath: string;
  topK: number;
  rest: string[];
};

function parseFlags(
  argv: string[],
  defaults: { root: string; dbPath: string; topK: number }
): ParsedFlags {
  let root = defaults.root;
  let dbPath = defaults.dbPath;
  let topK = defaults.topK;
  const rest: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--root") {
      root = argv[++i] ?? usage();
      continue;
    }
    if (a === "--db") {
      dbPath = argv[++i] ?? usage();
      continue;
    }
    if (a === "--top") {
      const n = Number(argv[++i]);
      if (!Number.isFinite(n) || n < 1) {
        usage();
      }
      topK = Math.floor(n);
      continue;
    }
    rest.push(a);
  }
  return { root, dbPath, topK, rest };
}

function formatHit(hit: SearchHit, i: number): string {
  const head = `${i + 1}. ${hit.path} (lines ${hit.startLine}–${hit.endLine})  distance=${hit.distance}`;
  const preview =
    hit.body.length > SEARCH_HIT_BODY_PREVIEW_CHARS
      ? `${hit.body.slice(0, SEARCH_HIT_BODY_PREVIEW_CHARS)}…`
      : hit.body;
  return `${head}\n${preview}\n`;
}

const apiKey = process.env.OPEN_AI_API_KEY;
if (!apiKey) {
  console.error("OPEN_AI_API_KEY is not set");
  process.exit(1);
}

const cmd = process.argv[2];
const argTail = process.argv.slice(3);

const defaultRoot = process.env.CODEBASE_ROOT ?? process.cwd();
const defaultDb =
  process.env.VECTOR_DB ?? defaultDatabasePath(process.cwd());
const model = process.env.EMBEDDING_MODEL ?? DEFAULT_EMBEDDING_MODEL;
const dimensions = Number(
  process.env.EMBEDDING_DIMENSIONS ?? String(DEFAULT_EMBEDDING_DIMENSIONS)
);
if (!Number.isFinite(dimensions) || dimensions < 1) {
  console.error("Invalid EMBEDDING_DIMENSIONS");
  process.exit(1);
}
const extPath = process.env.SQLITE_VECTOR_EXTENSION;
const customSql = process.env.SQLITE3_DYLIB ?? process.env.BUN_CUSTOM_SQLITELIB;

if (cmd === "index") {
  const { root, dbPath } = parseFlags(argTail, {
    root: defaultRoot,
    dbPath: defaultDb,
    topK: DEFAULT_TOP_K,
  });
  console.error(`Indexing ${root} -> ${dbPath} …`);
  const { files, chunks } = await indexCodebase({
    root,
    dbPath,
    openAiKey: apiKey,
    embeddingModel: model,
    dimensions,
    extensionPath: extPath,
    customSqliteLib: customSql,
  });
  console.log(`Done. ${files} files, ${chunks} chunks.`);
  process.exit(0);
}

if (cmd === "search") {
  const { dbPath, topK, rest } = parseFlags(argTail, {
    root: defaultRoot,
    dbPath: defaultDb,
    topK: DEFAULT_TOP_K,
  });
  const query = rest.join(" ").trim();
  if (!query) {
    usage();
  }
  const hits = await searchCodebase({
    dbPath,
    query,
    openAiKey: apiKey,
    embeddingModel: model,
    dimensions,
    topK,
    extensionPath: extPath,
    customSqliteLib: customSql,
  });
  if (hits.length === 0) {
    console.log("No results (is the index empty? Run vector:index).");
  } else {
    console.log(hits.map((h, i) => formatHit(h, i)).join("\n"));
  }
  process.exit(0);
}

usage();
