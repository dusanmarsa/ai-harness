import OpenAI from "openai";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { chunkSource } from "./chunk";
import { embedTexts } from "./embed";
import {
  openVectorDatabase,
  rebuildVectorIndex,
  type OpenVectorDbOptions,
} from "./openDb";
import {
  COL_TEXT_BODY,
  COL_TEXT_EMBEDDING,
  COL_TEXT_END_LINE,
  COL_TEXT_PATH,
  COL_TEXT_START_LINE,
  META_KEY_DIMENSIONS,
  META_KEY_EMBEDDING_MODEL,
  META_KEY_INDEXED_AT,
  META_KEY_ROOT,
  TABLE_TEXT_CHUNKS,
} from "../constants";
import { setMeta } from "../utils";
import { walkCodebase } from "./walkCodebase";

export type IndexOptions = {
  root: string;
  dbPath: string;
  openAiKey: string;
  embeddingModel: string;
  dimensions: number;
  extensionPath?: string;
  customSqliteLib?: string;
};

export const indexCodebase = async (
  options: IndexOptions,
): Promise<{
  files: number;
  chunks: number;
}> => {
  await mkdir(dirname(options.dbPath), { recursive: true });

  const openOpts: OpenVectorDbOptions = {
    dbPath: options.dbPath,
    dimensions: options.dimensions,
    extensionPath: options.extensionPath,
    customSqliteLib: options.customSqliteLib,
    readonly: false,
  };

  const db = openVectorDatabase(openOpts);

  try {
    db.run(`DELETE FROM ${TABLE_TEXT_CHUNKS};`);

    const files = await walkCodebase(options.root);

    const rows: {
      path: string;
      startLine: number;
      endLine: number;
      text: string;
    }[] = [];

    for (const f of files) {
      let raw: string;

      try {
        raw = await Bun.file(f.absPath).text();
      } catch {
        continue;
      }

      const safe = raw.replace(/\0/g, "");

      for (const ch of chunkSource(safe)) {
        if (!ch.text.trim()) {
          continue;
        }

        rows.push({
          path: f.relPath,
          startLine: ch.startLine,
          endLine: ch.endLine,
          text: ch.text,
        });
      }
    }

    const client = new OpenAI({ apiKey: options.openAiKey });

    const insert = db.prepare(`
      INSERT INTO ${TABLE_TEXT_CHUNKS} (
        ${COL_TEXT_PATH},
        ${COL_TEXT_START_LINE},
        ${COL_TEXT_END_LINE},
        ${COL_TEXT_BODY},
        ${COL_TEXT_EMBEDDING}
      )
      VALUES (?, ?, ?, ?, vector_as_f32(?))
    `);

    db.run(`BEGIN IMMEDIATE;`);

    try {
      const texts = rows.map((r) => r.text);

      const embeddings = await embedTexts(
        client,
        texts,
        options.embeddingModel,
        options.dimensions,
      );

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i]!;
        const emb = embeddings[i]!;

        insert.run(r.path, r.startLine, r.endLine, r.text, JSON.stringify(emb));
      }

      db.run(`COMMIT;`);
    } catch (e) {
      db.run(`ROLLBACK;`);
      throw e;
    }

    rebuildVectorIndex(db);

    const now = new Date().toISOString();
    
    setMeta(db, META_KEY_DIMENSIONS, String(options.dimensions));
    setMeta(db, META_KEY_EMBEDDING_MODEL, options.embeddingModel);
    setMeta(db, META_KEY_ROOT, options.root);
    setMeta(db, META_KEY_INDEXED_AT, now);

    return { files: files.length, chunks: rows.length };
  } finally {
    db.close();
  }
};
