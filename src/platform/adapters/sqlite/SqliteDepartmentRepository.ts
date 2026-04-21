import type { Database } from "better-sqlite3";
import type { Department } from "../../../domain/governance";
import type { IDepartmentRepository } from "../../contracts/IDepartmentRepository";

function rowToDepartment(row: Record<string, unknown>): Department {
  return { ...(row as Omit<Department, "isActive">), isActive: Boolean(row["isActive"]) };
}

export class SqliteDepartmentRepository implements IDepartmentRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string): Promise<Department | null> {
    const row = this.db.prepare("SELECT * FROM departments WHERE id = ?").get(id);
    return row ? rowToDepartment(row as Record<string, unknown>) : null;
  }

  async findAll(): Promise<Department[]> {
    return (this.db.prepare("SELECT * FROM departments").all() as Record<string, unknown>[]).map(
      rowToDepartment
    );
  }
}
