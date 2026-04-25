import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { Correspondence } from "../src/domain/correspondence";
import type { NotificationPayload } from "../src/platform/contracts/INotificationService";
import { openDatabase } from "../src/platform/adapters/sqlite/SqliteDatabase";
import { SqliteCorrespondenceAuditLogRepository } from "../src/platform/adapters/sqlite/SqliteCorrespondenceAuditLogRepository";
import { SqlitePostCaptureWorkflowService } from "../src/platform/adapters/sqlite/SqlitePostCaptureWorkflowService";
import { createSqliteHostAdapter } from "../src/platform/adapters/sqlite/SqliteHostAdapter";

class RecordingNotificationService {
  readonly sent: NotificationPayload[] = [];

  async send(payload: NotificationPayload): Promise<void> {
    this.sent.push(payload);
  }
}

function createStoredCorrespondence(actor: Awaited<ReturnType<ReturnType<typeof createSqliteHostAdapter>["users"]["findAll"]>>[number]): Correspondence {
  const now = new Date("2026-04-23T10:00:00.000Z");
  return {
    id: crypto.randomUUID(),
    reference: "BANK-MAIN-ADMIN-202604-000001",
    subject: "Workflow verification",
    direction: "INCOMING",
    fromTo: "Central Bank",
    organisation: "Central Bank",
    branchId: actor.branchId,
    departmentId: actor.departmentId,
    registeredById: actor.id,
    recipientId: actor.id,
    actionOwnerId: actor.id,
    status: "NEW",
    receivedDate: now,
    dueDate: new Date("2026-04-30T00:00:00.000Z"),
    createdAt: now,
    updatedAt: now,
    createBy: actor,
    updateBy: actor
  };
}

test("SQLite workflow service logs a BASIC notification event", async () => {
  const tempDir = mkdtempSync(join(tmpdir(), "coreman-sqlite-workflow-"));
  const dbPath = join(tempDir, "coreman.db");
  let adapter: (ReturnType<typeof createSqliteHostAdapter> & { close?: () => void }) | null = null;
  let auditDb: ReturnType<typeof openDatabase> | null = null;

  try {
    adapter = createSqliteHostAdapter(dbPath) as ReturnType<typeof createSqliteHostAdapter> & { close?: () => void };
    const [actor] = await adapter.users.findAll();
    assert.ok(actor);

    const correspondence = createStoredCorrespondence(actor);
    await adapter.correspondences.save(correspondence);

    const notifications = new RecordingNotificationService();
  auditDb = openDatabase(dbPath);
  const auditLog = new SqliteCorrespondenceAuditLogRepository(auditDb);
    const service = new SqlitePostCaptureWorkflowService(notifications, auditLog);

    await service.execute({
      correspondence,
      actor,
      mode: "BASIC"
    });

    assert.equal(notifications.sent.length, 1);
    assert.match(notifications.sent[0]?.subject ?? "", /Correspondence .* received/);

    const events = await auditLog.findByCorrespondence(correspondence.id);
    assert.equal(events.length, 1);
    assert.equal(events[0]?.eventType, "NOTIFICATION_SENT");
  } finally {
    auditDb?.close();
    adapter?.close?.();
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("SQLite workflow service logs extended workflow audit trail", async () => {
  const tempDir = mkdtempSync(join(tmpdir(), "coreman-sqlite-workflow-"));
  const dbPath = join(tempDir, "coreman.db");
  let adapter: (ReturnType<typeof createSqliteHostAdapter> & { close?: () => void }) | null = null;
  let auditDb: ReturnType<typeof openDatabase> | null = null;

  try {
    adapter = createSqliteHostAdapter(dbPath) as ReturnType<typeof createSqliteHostAdapter> & { close?: () => void };
    const [actor] = await adapter.users.findAll();
    assert.ok(actor);

    const correspondence = createStoredCorrespondence(actor);
    await adapter.correspondences.save(correspondence);

    const notifications = new RecordingNotificationService();
  auditDb = openDatabase(dbPath);
  const auditLog = new SqliteCorrespondenceAuditLogRepository(auditDb);
    const service = new SqlitePostCaptureWorkflowService(notifications, auditLog);

    await service.execute({
      correspondence,
      actor,
      mode: "EXTENDED",
      context: {
        digitalContent: "base64:sample",
        metadata: {
          branchId: correspondence.branchId,
          departmentId: correspondence.departmentId,
          direction: correspondence.direction
        }
      }
    });

    assert.equal(notifications.sent.length, 1);
    assert.equal(notifications.sent[0]?.subject, `Action required: ${correspondence.reference}`);

    const events = await auditLog.findByCorrespondence(correspondence.id);
    assert.equal(events.length, 3);
    assert.deepEqual(
      events.map((event) => event.eventType),
      ["AGENT_CALL", "AGENT_RESPONSE", "NOTIFICATION_SENT"]
    );
  } finally {
    auditDb?.close();
    adapter?.close?.();
    rmSync(tempDir, { recursive: true, force: true });
  }
});