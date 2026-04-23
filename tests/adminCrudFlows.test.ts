import test from "node:test";
import assert from "node:assert/strict";
import { createInMemoryHostAdapter } from "../src/platform/adapters/inMemory/InMemoryHostAdapter";
import { ALL_ROLE_CODES } from "../src/domain/governance";
import { demoUsers } from "../src/application/modules/admin/seedData";

test("in-memory admin CRUD supports branch, department, and user entities", async () => {
  const adapter = createInMemoryHostAdapter();

  await adapter.branches.save({
    id: "b-900",
    code: "BRN-900",
    name: "Test Branch",
    isActive: true
  });
  assert.ok((await adapter.branches.findById("b-900"))?.name === "Test Branch");

  await adapter.departments.save({
    id: "d-900",
    code: "OPSX",
    name: "Ops X",
    isActive: true
  });
  assert.ok((await adapter.departments.findById("d-900"))?.name === "Ops X");

  await adapter.users.save({
    id: "u-900",
    employeeCode: "EMP-900",
    fullName: "Test User",
    email: "test.user@bank.local",
    branchId: "b-900",
    departmentId: "d-900",
    isActive: true,
    canLogin: true,
    canOwnActions: true,
    roles: ["ADMIN", "RECEPTIONIST"]
  });
  assert.ok((await adapter.users.findById("u-900"))?.fullName === "Test User");

  await adapter.users.delete("u-900");
  await adapter.departments.delete("d-900");
  await adapter.branches.delete("b-900");

  assert.equal(await adapter.users.findById("u-900"), null);
  assert.equal(await adapter.departments.findById("d-900"), null);
  assert.equal(await adapter.branches.findById("b-900"), null);
});

test("seeded default super admin has all platform roles", () => {
  const superAdmin = demoUsers.find((user) => user.email === "superadmin@bank.local");
  assert.ok(superAdmin);

  const roles = new Set(superAdmin.roles);
  for (const role of ALL_ROLE_CODES) {
    assert.ok(roles.has(role), `Missing role ${role}`);
  }
});

test("in-memory action definitions support CRUD and active filtering", async () => {
  const adapter = createInMemoryHostAdapter();
  const initialCount = (await adapter.actionDefinitions.findAll()).length;

  const now = new Date();
  await adapter.actionDefinitions.save({
    id: "act-900",
    code: "EXEC_PROCESS_X",
    label: "Execute Process X",
    description: "Owner-executed workflow action",
    category: "PROCESS",
    requiresOwner: true,
    triggerMode: "OWNER_EXECUTE",
    workflowEnabled: true,
    workflowMethod: "POST",
    workflowEndpointUrl: "https://workflow.local/process-x",
    workflowTimeoutMs: 12000,
    authType: "API_KEY",
    authSecretRef: "secrets/process-x-api-key",
    payloadTemplate: "{\"correspondenceId\":\"{{correspondence.id}}\"}",
    retryMaxAttempts: 1,
    retryBackoffMs: 500,
    defaultSlaDays: 2,
    isActive: true,
    createdAt: now,
    updatedAt: now
  });

  const saved = await adapter.actionDefinitions.findById("act-900");
  assert.ok(saved);
  assert.equal(saved.code, "EXEC_PROCESS_X");

  const active = await adapter.actionDefinitions.findActive();
  assert.ok(active.some((definition) => definition.id === "act-900"));

  await adapter.actionDefinitions.delete("act-900");
  assert.equal(await adapter.actionDefinitions.findById("act-900"), null);
  assert.equal((await adapter.actionDefinitions.findAll()).length, initialCount);
});

test("in-memory action definitions reject duplicate code", async () => {
  const adapter = createInMemoryHostAdapter();
  const now = new Date();

  await adapter.actionDefinitions.save({
    id: "act-910",
    code: "UNIQUE_CODE_A",
    label: "Unique A",
    category: "TASK",
    requiresOwner: true,
    triggerMode: "OWNER_EXECUTE",
    workflowEnabled: true,
    workflowMethod: "POST",
    workflowEndpointUrl: "https://workflow.local/task-a",
    workflowTimeoutMs: 8000,
    authType: "NONE",
    retryMaxAttempts: 0,
    retryBackoffMs: 0,
    isActive: true,
    createdAt: now,
    updatedAt: now
  });

  await assert.rejects(
    adapter.actionDefinitions.save({
      id: "act-911",
      code: "unique_code_a",
      label: "Unique A Duplicate",
      category: "TASK",
      requiresOwner: true,
      triggerMode: "OWNER_EXECUTE",
      workflowEnabled: true,
      workflowMethod: "POST",
      workflowEndpointUrl: "https://workflow.local/task-b",
      workflowTimeoutMs: 8000,
      authType: "NONE",
      retryMaxAttempts: 0,
      retryBackoffMs: 0,
      isActive: true,
      createdAt: now,
      updatedAt: now
    }),
    /already exists/
  );
});
