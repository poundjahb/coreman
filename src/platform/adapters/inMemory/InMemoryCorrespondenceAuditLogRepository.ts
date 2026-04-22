import type {
  CorrespondenceAuditEvent,
  CreateCorrespondenceAuditEvent,
  ICorrespondenceAuditLogRepository
} from "../../contracts/ICorrespondenceAuditLogRepository";

function createId(): string {
  if (typeof globalThis.crypto !== "undefined" && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `audit-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

export class InMemoryCorrespondenceAuditLogRepository implements ICorrespondenceAuditLogRepository {
  readonly events: CorrespondenceAuditEvent[] = [];

  async append(event: CreateCorrespondenceAuditEvent): Promise<CorrespondenceAuditEvent> {
    const created: CorrespondenceAuditEvent = {
      id: createId(),
      createdAt: new Date(),
      ...event
    };
    this.events.push(created);
    return created;
  }

  async findByCorrespondence(correspondenceId: string): Promise<CorrespondenceAuditEvent[]> {
    return this.events.filter((event) => event.correspondenceId === correspondenceId);
  }
}