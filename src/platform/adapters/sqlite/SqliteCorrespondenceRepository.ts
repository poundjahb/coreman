import type { Database } from "better-sqlite3";
import type { Correspondence } from "../../../domain/correspondence";
import type { ICorrespondenceRepository } from "../../contracts/ICorrespondenceRepository";

export class SqliteCorrespondenceRepository implements ICorrespondenceRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string): Promise<Correspondence | null> {
    const row = this.db.prepare("SELECT * FROM correspondences WHERE id = ?").get(id);
    return (row as Correspondence) ?? null;
  }

  async findAll(): Promise<Correspondence[]> {
    return this.db.prepare("SELECT * FROM correspondences").all() as Correspondence[];
  }

  async findByBranch(branchId: string): Promise<Correspondence[]> {
    return this.db
      .prepare("SELECT * FROM correspondences WHERE branchId = ?")
      .all(branchId) as Correspondence[];
  }

  async save(correspondence: Correspondence): Promise<void> {
    this.db
      .prepare(
        `INSERT OR REPLACE INTO correspondences
          (id, reference, subject, direction, branchId, departmentId, registeredById,
           recipientId, actionOwnerId, status, receivedDate, dueDate, createdAt, updatedAt)
         VALUES
          (@id, @reference, @subject, @direction, @branchId, @departmentId, @registeredById,
           @recipientId, @actionOwnerId, @status, @receivedDate, @dueDate, @createdAt, @updatedAt)`
      )
      .run(correspondence);
  }

  async update(id: string, changes: Partial<Omit<Correspondence, "id">>): Promise<void> {
    const sets = Object.keys(changes)
      .map((k) => `${k} = @${k}`)
      .join(", ");
    this.db.prepare(`UPDATE correspondences SET ${sets} WHERE id = @id`).run({ ...changes, id });
  }
}
