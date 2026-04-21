import type { Database } from "better-sqlite3";
import type { SequenceStore } from "../../../domain/reference";

export class SqliteSequenceStore implements SequenceStore {
  constructor(private readonly db: Database) {}

  next(key: string): number {
    this.db
      .prepare(
        `INSERT INTO sequences (key, value) VALUES (?, 1)
         ON CONFLICT(key) DO UPDATE SET value = value + 1`
      )
      .run(key);
    const row = this.db
      .prepare("SELECT value FROM sequences WHERE key = ?")
      .get(key) as { value: number };
    return row.value;
  }
}
