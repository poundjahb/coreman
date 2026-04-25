import type { Database } from "better-sqlite3";
import type { AppUser } from "../../../domain/governance";
import type { IUserRepository } from "../../contracts/IUserRepository";

function rowToUser(row: Record<string, unknown>): AppUser {
  return {
    ...(row as Omit<AppUser, "isActive" | "canLogin" | "canOwnActions" | "roles">),
    isActive: Boolean(row["isActive"]),
    canLogin: Boolean(row["canLogin"]),
    canOwnActions: Boolean(row["canOwnActions"]),
    roles: JSON.parse(row["roles"] as string)
  };
}

export class SqliteUserRepository implements IUserRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string): Promise<AppUser | null> {
    const row = this.db.prepare("SELECT * FROM users WHERE id = ?").get(id);
    return row ? rowToUser(row as Record<string, unknown>) : null;
  }

  async findAll(): Promise<AppUser[]> {
    return (this.db.prepare("SELECT * FROM users").all() as Record<string, unknown>[]).map(rowToUser);
  }

  async findByBranch(branchId: string): Promise<AppUser[]> {
    return (
      this.db.prepare("SELECT * FROM users WHERE branchId = ?").all(branchId) as Record<string, unknown>[]
    ).map(rowToUser);
  }

  async save(user: AppUser): Promise<void> {
    this.db.prepare(
      `INSERT OR REPLACE INTO users
        (id, userId, employeeCode, fullName, email, branchId, departmentId, isActive, canLogin, canOwnActions, roles)
       VALUES
        (@id, @userId, @employeeCode, @fullName, @email, @branchId, @departmentId, @isActive, @canLogin, @canOwnActions, @roles)`
    ).run({
      ...user,
      isActive: user.isActive ? 1 : 0,
      canLogin: user.canLogin ? 1 : 0,
      canOwnActions: user.canOwnActions ? 1 : 0,
      roles: JSON.stringify(user.roles)
    });
  }

  async delete(id: string): Promise<void> {
    this.db.prepare("DELETE FROM users WHERE id = ?").run(id);
  }
}
