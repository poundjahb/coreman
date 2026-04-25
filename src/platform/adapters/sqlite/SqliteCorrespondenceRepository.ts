import type { Database } from "better-sqlite3";
import type { Correspondence } from "../../../domain/correspondence";
import type { AppUser, RoleCode } from "../../../domain/governance";
import type { ICorrespondenceRepository } from "../../contracts/ICorrespondenceRepository";

type CorrespondenceRow = Omit<
  Correspondence,
  | "senderReference"
  | "summary"
  | "organisation"
  | "departmentId"
  | "recipientId"
  | "actionOwnerId"
  | "correspondenceDate"
  | "receivedDate"
  | "dueDate"
  | "createdAt"
  | "updatedAt"
  | "createBy"
  | "updateBy"
> & {
  senderReference?: string | null;
  summary?: string | null;
  organisation?: string | null;
  departmentId?: string | null;
  recipientId?: string | null;
  actionOwnerId?: string | null;
  correspondenceDate?: string | null;
  receivedDate: string;
  dueDate?: string | null;
  createdAt: string;
  updatedAt: string;
  createById?: string | null;
  updateById?: string | null;
};

type UserRow = {
  id: string;
  userId: string;
  employeeCode: string;
  fullName: string;
  email: string;
  branchId: string;
  departmentId: string;
  isActive: number;
  canLogin: number;
  canOwnActions: number;
  roles: string;
};

function parseUser(row: UserRow): AppUser {
  return {
    id: row.id,
    userId: row.userId,
    employeeCode: row.employeeCode,
    fullName: row.fullName,
    email: row.email,
    branchId: row.branchId,
    departmentId: row.departmentId,
    isActive: row.isActive === 1,
    canLogin: row.canLogin === 1,
    canOwnActions: row.canOwnActions === 1,
    roles: JSON.parse(row.roles) as RoleCode[]
  };
}

function getUserMap(db: Database): Map<string, AppUser> {
  const rows = db.prepare("SELECT * FROM users").all() as UserRow[];
  return new Map(rows.map((row) => {
    const user = parseUser(row);
    return [user.id, user] as const;
  }));
}

function resolveAuditUser(userId: string | null | undefined, fallbackId: string, usersById: Map<string, AppUser>): AppUser {
  const resolvedId = userId && userId.length > 0 ? userId : fallbackId;
  const user = usersById.get(resolvedId);
  if (!user) {
    throw new Error(`Audit user '${resolvedId}' was not found.`);
  }

  return user;
}

function toRow(correspondence: Correspondence): CorrespondenceRow {
  return {
    ...correspondence,
    senderReference: correspondence.senderReference ?? null,
    summary: correspondence.summary ?? null,
    organisation: correspondence.organisation ?? null,
    departmentId: correspondence.departmentId ?? null,
    recipientId: correspondence.recipientId ?? null,
    actionOwnerId: correspondence.actionOwnerId ?? null,
    createById: correspondence.createBy.id,
    updateById: correspondence.updateBy.id,
    correspondenceDate: correspondence.correspondenceDate
      ? correspondence.correspondenceDate.toISOString()
      : null,
    receivedDate: correspondence.receivedDate.toISOString(),
    dueDate: correspondence.dueDate ? correspondence.dueDate.toISOString() : null,
    createdAt: correspondence.createdAt.toISOString(),
    updatedAt: correspondence.updatedAt.toISOString()
  };
}

function fromRow(row: CorrespondenceRow, usersById: Map<string, AppUser>): Correspondence {
  return {
    ...row,
    senderReference: row.senderReference ?? undefined,
    summary: row.summary ?? undefined,
    organisation: row.organisation ?? undefined,
    departmentId: row.departmentId ?? undefined,
    recipientId: row.recipientId ?? undefined,
    actionOwnerId: row.actionOwnerId ?? undefined,
    correspondenceDate: row.correspondenceDate ? new Date(row.correspondenceDate) : undefined,
    receivedDate: new Date(row.receivedDate),
    dueDate: row.dueDate ? new Date(row.dueDate) : undefined,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
    createBy: resolveAuditUser(row.createById, row.registeredById, usersById),
    updateBy: resolveAuditUser(row.updateById, row.registeredById, usersById)
  };
}

export class SqliteCorrespondenceRepository implements ICorrespondenceRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string): Promise<Correspondence | null> {
    const row = this.db.prepare("SELECT * FROM correspondences WHERE id = ?").get(id);
    if (!row) {
      return null;
    }

    const usersById = getUserMap(this.db);
    return fromRow(row as CorrespondenceRow, usersById);
  }

  async findAll(): Promise<Correspondence[]> {
    const rows = this.db.prepare("SELECT * FROM correspondences").all() as CorrespondenceRow[];
    const usersById = getUserMap(this.db);
    return rows.map((row) => fromRow(row, usersById));
  }

  async findByBranch(branchId: string): Promise<Correspondence[]> {
    const rows = this.db
      .prepare("SELECT * FROM correspondences WHERE branchId = ?")
      .all(branchId) as CorrespondenceRow[];
    const usersById = getUserMap(this.db);
    return rows.map((row) => fromRow(row, usersById));
  }

  async save(correspondence: Correspondence): Promise<void> {
    if (correspondence.summary && correspondence.summary.length > 500) {
      throw new Error("Summary cannot exceed 500 characters.");
    }

    this.db
      .prepare(
        `INSERT OR REPLACE INTO correspondences
          (id, reference, senderReference, subject, direction, fromTo, organisation, correspondenceDate, branchId,
           departmentId, registeredById, recipientId, actionOwnerId, status, receivedDate,
           dueDate, createdAt, updatedAt, createById, updateById, summary)
         VALUES
          (@id, @reference, @senderReference, @subject, @direction, @fromTo, @organisation, @correspondenceDate,
           @branchId, @departmentId, @registeredById, @recipientId, @actionOwnerId, @status,
           @receivedDate, @dueDate, @createdAt, @updatedAt, @createById, @updateById, @summary)`
      )
      .run(toRow(correspondence));
  }

  async update(id: string, changes: Partial<Omit<Correspondence, "id">>): Promise<void> {
    if (changes.summary && changes.summary.length > 500) {
      throw new Error("Summary cannot exceed 500 characters.");
    }

    const existing = await this.findById(id);
    if (!existing) {
      return;
    }

    const { createBy, updateBy, ...restChanges } = changes;
    const effectiveUpdateBy = updateBy ?? existing.updateBy;

    const updatePayload = {
      ...restChanges,
      createById: createBy ? createBy.id : undefined,
      updateById: effectiveUpdateBy.id,
      correspondenceDate: changes.correspondenceDate
        ? changes.correspondenceDate.toISOString()
        : changes.correspondenceDate === undefined
          ? undefined
          : null,
      receivedDate: changes.receivedDate ? changes.receivedDate.toISOString() : undefined,
      dueDate: changes.dueDate
        ? changes.dueDate.toISOString()
        : changes.dueDate === undefined
          ? undefined
          : null,
      createdAt: changes.createdAt ? changes.createdAt.toISOString() : undefined,
      updatedAt: new Date().toISOString()
    };

    const sets = Object.keys(updatePayload)
      .filter((k) => updatePayload[k as keyof typeof updatePayload] !== undefined)
      .map((k) => `${k} = @${k}`)
      .join(", ");

    if (!sets) {
      return;
    }

    this.db.prepare(`UPDATE correspondences SET ${sets} WHERE id = @id`).run({ ...updatePayload, id });
  }
}
