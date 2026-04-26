import OpenAI from "openai";
import { embedTexts } from "./embed";
import {
  openVectorDatabase,
  preloadVectorIndex,
  type OpenVectorDbOptions,
} from "./openDb";
import {
  COL_TEXT_EMBEDDING,
  META_KEY_DIMENSIONS,
  TABLE_TEXT_CHUNKS,
} from "../constants";
import { getMeta } from "../utils";

export type SearchHit = {
  path: string;
  startLine: number;
  endLine: number;
  body: string;
  distance: number;
};

export type SearchOptions = {
  dbPath: string;
  query: string;
  openAiKey: string;
  embeddingModel: string;
  dimensions: number;
  topK: number;
  extensionPath?: string;
  customSqliteLib?: string;
};

export async function searchCodebase(
  options: SearchOptions,
): Promise<SearchHit[]> {
  const openOpts: OpenVectorDbOptions = {
    dbPath: options.dbPath,
    dimensions: options.dimensions,
    extensionPath: options.extensionPath,
    customSqliteLib: options.customSqliteLib,
    readonly: false,
  };

  const db = openVectorDatabase(openOpts);
  try {
    const dimMeta = getMeta(db, META_KEY_DIMENSIONS);
    if (dimMeta && Number(dimMeta) !== options.dimensions) {
      throw new Error(
        `Embedding dimensions mismatch: index has ${dimMeta}, but EMBEDDING_DIMENSIONS (or default) is ${options.dimensions}. Re-run vector:index or align env.`,
      );
    }

    preloadVectorIndex(db);

    const countRow = db
      .query(`SELECT COUNT(*) as c FROM ${TABLE_TEXT_CHUNKS}`)
      .get() as { c: number };
    if (Number(countRow.c) === 0) {
      return [];
    }

    const client = new OpenAI({ apiKey: options.openAiKey });
    const [queryEmbedding] = await embedTexts(
      client,
      [options.query],
      options.embeddingModel,
      options.dimensions,
    );
    if (!queryEmbedding) {
      return [];
    }

    const qJson = JSON.stringify(queryEmbedding);
    const k = options.topK;

    const rows = db
      .query(
        `SELECT c.path AS path, c.start_line AS startLine, c.end_line AS endLine,
                c.body AS body, v.distance AS distance
         FROM ${TABLE_TEXT_CHUNKS} c
         INNER JOIN vector_quantize_scan('${TABLE_TEXT_CHUNKS}', '${COL_TEXT_EMBEDDING}', vector_as_f32(?), ?) v
         ON c.id = v.rowid`,
      )
      .all(qJson, k) as SearchHit[];

    return rows
      .map((r) => ({
        ...r,
        distance: Number(r.distance),
        startLine: Number(r.startLine),
        endLine: Number(r.endLine),
      }))
      .sort((a, b) => b.distance - a.distance);
  } finally {
    db.close();
  }
}
