import test from "node:test";
import assert from "node:assert/strict";
import { createInMemoryHostAdapter } from "../src/platform/adapters/inMemory/InMemoryHostAdapter";
import { registerCorrespondenceInHost } from "../src/application/modules/intake/registerCorrespondence";
import { demoUsers } from "../src/application/modules/admin/seedData";

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

test("registerCorrespondenceInHost rejects department outside selected branch policy", async () => {
  const adapter = createInMemoryHostAdapter();
  const receptionist = getReceptionist();

  await assert.rejects(
    () =>
      registerCorrespondenceInHost(
        adapter,
        receptionist,
        {
          subject: "Invalid branch mapping",
          branchId: "b-002",
          departmentId: "d-001",
          direction: "INCOMING"
        },
        "BANK"
      ),
    /not allowed for this branch/
  );
});
