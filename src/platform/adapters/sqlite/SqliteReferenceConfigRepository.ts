import type { Database } from "better-sqlite3";
import type { ReferenceFormatConfig } from "../../../domain/reference";
import type { IReferenceConfigRepository } from "../../contracts/IReferenceConfigRepository";

function rowToConfig(row: Record<string, unknown>): ReferenceFormatConfig {
  return { ...(row as Omit<ReferenceFormatConfig, "isActive">), isActive: Boolean(row["isActive"]) };
}

export class SqliteReferenceConfigRepository implements IReferenceConfigRepository {
  constructor(private readonly db: Database) {}

  async findAll(): Promise<ReferenceFormatConfig[]> {
    return (
      this.db.prepare("SELECT * FROM reference_configs").all() as Record<string, unknown>[]
    ).map(rowToConfig);
  }

  async findActive(): Promise<ReferenceFormatConfig[]> {
    return (
      this.db
        .prepare("SELECT * FROM reference_configs WHERE isActive = 1")
        .all() as Record<string, unknown>[]
    ).map(rowToConfig);
  }
}
