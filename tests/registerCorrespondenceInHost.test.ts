import test from "node:test";
import assert from "node:assert/strict";
import { createInMemoryHostAdapter } from "../src/platform/adapters/inMemory/InMemoryHostAdapter";
import { InMemoryCorrespondenceAuditLogRepository } from "../src/platform/adapters/inMemory/InMemoryCorrespondenceAuditLogRepository";
import { InMemoryNotificationService } from "../src/platform/adapters/inMemory/InMemoryNotificationService";
import { registerCorrespondenceInHost } from "../src/application/modules/intake/registerCorrespondence";
import { demoUsers } from "../src/application/modules/admin/seedData";
import { workflowConfig } from "../src/config/systemConfig";

function getReceptionist() {
  const receptionist = demoUsers.find((user) => user.roles.includes("RECEPTIONIST"));
  if (!receptionist) {
    throw new Error("No receptionist user found in seed data.");
  }
  return receptionist;
}

test("registerCorrespondenceInHost persists outgoing correspondence", async () => {
  const adapter = createInMemoryHostAdapter();
  const receptionist = getReceptionist();

  const before = await adapter.correspondences.findAll();

  const result = await registerCorrespondenceInHost(
    adapter,
    receptionist,
    {
      subject: "Outgoing policy update",
      fromTo: "Policy Recipient",
      branchId: "b-001",
      departmentId: "d-002",
      direction: "OUTGOING"
    },
    "BANK"
  );

  assert.ok(result.referenceNumber.length > 0);
  assert.equal(result.subject, "Outgoing policy update");

  const after = await adapter.correspondences.findAll();
  assert.equal(after.length, before.length + 1);

  const saved = after.find((item) => item.id === result.correspondenceId);
  assert.ok(saved);
  assert.equal(saved.direction, "OUTGOING");
  assert.equal(saved.status, "NEW");
});

test("registerCorrespondenceInHost accepts active departments while branch mapping is not persisted", async () => {
  const adapter = createInMemoryHostAdapter();
  const receptionist = getReceptionist();

  const result = await registerCorrespondenceInHost(
    adapter,
    receptionist,
    {
      subject: "Cross-branch active department",
      fromTo: "Branch Sender",
      branchId: "b-002",
      departmentId: "d-001",
      direction: "INCOMING"
    },
    "BANK"
  );

  assert.ok(result.referenceNumber.length > 0);
});

test("registerCorrespondenceInHost rejects inactive department", async () => {
  const adapter = createInMemoryHostAdapter();
  const receptionist = getReceptionist();

  await adapter.departments.save({
    id: "d-999",
    code: "INACTIVE",
    name: "Inactive Department",
    isActive: false
  });

  await assert.rejects(
    () =>
      registerCorrespondenceInHost(
        adapter,
        receptionist,
        {
          subject: "Inactive department",
          fromTo: "Branch Sender",
          branchId: "b-001",
          departmentId: "d-999",
          direction: "INCOMING"
        },
        "BANK"
      ),
    /not allowed for this branch/
  );
});

test("registerCorrespondenceInHost runs basic workflow transparently", async () => {
  const previousMode = workflowConfig.mode;
  workflowConfig.mode = "BASIC";

  try {
    const adapter = createInMemoryHostAdapter();
    const receptionist = getReceptionist();

    const result = await registerCorrespondenceInHost(
      adapter,
      receptionist,
      {
        subject: "Incoming customer complaint",
        fromTo: "Jane Sender",
        branchId: "b-001",
        departmentId: "d-002",
        direction: "INCOMING",
        recipientId: "u-002"
      },
      "BANK"
    );

    const notifications = adapter.notifications as InMemoryNotificationService;
    const auditLog = adapter.correspondenceAuditLog as InMemoryCorrespondenceAuditLogRepository;

    assert.equal(notifications.sent.length, 1);
    assert.equal(notifications.sent[0]?.correspondenceId, result.correspondenceId);

    const events = await auditLog.findByCorrespondence(result.correspondenceId);
    assert.equal(events.length, 2);
    assert.deepEqual(
      events.map((event) => event.eventType),
      ["CORRESPONDENCE_CREATED", "NOTIFICATION_SENT"]
    );
  } finally {
    workflowConfig.mode = previousMode;
  }
});

test("registerCorrespondenceInHost runs extended workflow and records three audit events", async () => {
  const previousMode = workflowConfig.mode;
  workflowConfig.mode = "EXTENDED";

  try {
    const adapter = createInMemoryHostAdapter();
    const receptionist = getReceptionist();

    const result = await registerCorrespondenceInHost(
      adapter,
      receptionist,
      {
        subject: "Regulatory instruction",
        fromTo: "Central Bank",
        branchId: "b-001",
        departmentId: "d-002",
        direction: "INCOMING",
        recipientId: "u-002",
        digitalContent: "base64:sample"
      },
      "BANK"
    );

    const notifications = adapter.notifications as InMemoryNotificationService;
    const auditLog = adapter.correspondenceAuditLog as InMemoryCorrespondenceAuditLogRepository;

    assert.equal(notifications.sent.length, 1);
    const events = await auditLog.findByCorrespondence(result.correspondenceId);
    assert.equal(events.length, 4);
    assert.deepEqual(
      events.map((event) => event.eventType),
      ["CORRESPONDENCE_CREATED", "AGENT_CALL", "AGENT_RESPONSE", "NOTIFICATION_SENT"]
    );
  } finally {
    workflowConfig.mode = previousMode;
  }
});

test("registerCorrespondenceInHost keeps capture successful when workflow fails", async () => {
  const previousMode = workflowConfig.mode;
  workflowConfig.mode = "BASIC";

  try {
    const adapter = createInMemoryHostAdapter();
    const receptionist = getReceptionist();

    adapter.postCaptureWorkflow.execute = async () => {
      throw new Error("Simulated workflow outage");
    };

    const result = await registerCorrespondenceInHost(
      adapter,
      receptionist,
      {
        subject: "Failure policy verification",
        fromTo: "Operations Team",
        branchId: "b-001",
        departmentId: "d-002",
        direction: "INCOMING"
      },
      "BANK"
    );

    assert.ok(result.referenceNumber.length > 0);

    const auditLog = adapter.correspondenceAuditLog as InMemoryCorrespondenceAuditLogRepository;
    const events = await auditLog.findByCorrespondence(result.correspondenceId);
    assert.equal(events.length, 2);
    assert.equal(events[0]?.eventType, "CORRESPONDENCE_CREATED");
    assert.equal(events[1]?.eventType, "WORKFLOW_FAILURE");
    assert.equal(events[1]?.status, "FAILED");
  } finally {
    workflowConfig.mode = previousMode;
  }
});

test("registerCorrespondenceInHost uses sender reference as main reference when provided", async () => {
  const adapter = createInMemoryHostAdapter();
  const receptionist = getReceptionist();

  const result = await registerCorrespondenceInHost(
    adapter,
    receptionist,
    {
      subject: "Incoming with external tracking",
      senderReference: "BCC10/230426",
      fromTo: "Central Bank",
      branchId: "b-001",
      departmentId: "d-002",
      direction: "INCOMING"
    },
    "BANK"
  );

  assert.equal(result.referenceNumber, "BCC10/230426");

  const saved = await adapter.correspondences.findById(result.correspondenceId);
  assert.ok(saved);
  assert.equal(saved.reference, "BCC10/230426");
  assert.equal(saved.senderReference, "BCC10/230426");
});

test("registerCorrespondenceInHost generates fallback reference when no active configs", async () => {
  const adapter = createInMemoryHostAdapter();
  const receptionist = getReceptionist();

  adapter.referenceConfigs.findActive = async () => [];

  const result = await registerCorrespondenceInHost(
    adapter,
    receptionist,
    {
      subject: "Incoming without sender reference",
      fromTo: "Operations Team",
      branchId: "b-001",
      departmentId: "d-002",
      direction: "INCOMING"
    },
    "BANK"
  );

  assert.match(result.referenceNumber, /^BANK\d+\/\d{6}$/);

  const saved = await adapter.correspondences.findById(result.correspondenceId);
  assert.ok(saved);
  assert.equal(saved.senderReference, undefined);
  assert.match(saved.reference, /^BANK\d+\/\d{6}$/);
});
