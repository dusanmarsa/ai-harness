import type { Database } from "bun:sqlite";

export function getMeta(db: Database, key: string): string | undefined {
  const row = db
    .query(`SELECT value FROM index_meta WHERE key = ?`)
    .get(key) as { value: string } | undefined;
  return row?.value;
}

export function setMeta(db: Database, key: string, value: string): void {
  db.run(`INSERT OR REPLACE INTO index_meta (key, value) VALUES (?, ?)`, [
    key,
    value,
  ]);
}
