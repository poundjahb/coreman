import { randomUUID } from "crypto";
import type { Database } from "better-sqlite3";
import type {
  CorrespondenceAuditEvent,
  CreateCorrespondenceAuditEvent,
  ICorrespondenceAuditLogRepository
} from "../../contracts/ICorrespondenceAuditLogRepository";

type CorrespondenceAuditRow = {
  id: string;
  correspondenceId: string;
  eventType: CorrespondenceAuditEvent["eventType"];
  status: CorrespondenceAuditEvent["status"];
  payloadJson: string | null;
  errorMessage: string | null;
  createdAt: string;
  createdById: string;
};

function toEvent(row: CorrespondenceAuditRow): CorrespondenceAuditEvent {
  return {
    id: row.id,
    correspondenceId: row.correspondenceId,
    eventType: row.eventType,
    status: row.status,
    payloadJson: row.payloadJson ?? undefined,
    errorMessage: row.errorMessage ?? undefined,
    createdAt: new Date(row.createdAt),
    createdById: row.createdById
  };
}

export class SqliteCorrespondenceAuditLogRepository implements ICorrespondenceAuditLogRepository {
  constructor(private readonly db: Database) {}

  async append(event: CreateCorrespondenceAuditEvent): Promise<CorrespondenceAuditEvent> {
    const createdAtIso = new Date().toISOString();
    const id = randomUUID();

    this.db.prepare(
      `INSERT INTO correspondence_audit_log
       (id, correspondenceId, eventType, status, payloadJson, errorMessage, createdAt, createdById)
       VALUES
       (@id, @correspondenceId, @eventType, @status, @payloadJson, @errorMessage, @createdAt, @createdById)`
    ).run({
      id,
      correspondenceId: event.correspondenceId,
      eventType: event.eventType,
      status: event.status,
      payloadJson: event.payloadJson ?? null,
      errorMessage: event.errorMessage ?? null,
      createdAt: createdAtIso,
      createdById: event.createdById
    });

    return {
      id,
      correspondenceId: event.correspondenceId,
      eventType: event.eventType,
      status: event.status,
      payloadJson: event.payloadJson,
      errorMessage: event.errorMessage,
      createdAt: new Date(createdAtIso),
      createdById: event.createdById
    };
  }

  async findByCorrespondence(correspondenceId: string): Promise<CorrespondenceAuditEvent[]> {
    const rows = this.db.prepare(
      `SELECT id, correspondenceId, eventType, status, payloadJson, errorMessage, createdAt, createdById
       FROM correspondence_audit_log
       WHERE correspondenceId = ?
       ORDER BY createdAt ASC`
    ).all(correspondenceId) as CorrespondenceAuditRow[];

    return rows.map(toEvent);
  }
}
