import type { Database } from "better-sqlite3";
import type { Branch } from "../../../domain/governance";
import type { IBranchRepository } from "../../contracts/IBranchRepository";

function rowToBranch(row: Record<string, unknown>): Branch {
  return { ...(row as Omit<Branch, "isActive">), isActive: Boolean(row["isActive"]) };
}

export class SqliteBranchRepository implements IBranchRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string): Promise<Branch | null> {
    const row = this.db.prepare("SELECT * FROM branches WHERE id = ?").get(id);
    return row ? rowToBranch(row as Record<string, unknown>) : null;
  }

  async findAll(): Promise<Branch[]> {
    return (this.db.prepare("SELECT * FROM branches").all() as Record<string, unknown>[]).map(rowToBranch);
  }

  async save(branch: Branch): Promise<void> {
    this.db.prepare(
      `INSERT OR REPLACE INTO branches (id, code, name, isActive)
       VALUES (@id, @code, @name, @isActive)`
    ).run({
      ...branch,
      isActive: branch.isActive ? 1 : 0
    });
  }

  async delete(id: string): Promise<void> {
    this.db.prepare("DELETE FROM branches WHERE id = ?").run(id);
  }
}
