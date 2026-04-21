import test from "node:test";
import assert from "node:assert/strict";
import { createInMemoryHostAdapter } from "../src/platform/adapters/inMemory/InMemoryHostAdapter.js";
import { ALL_ROLE_CODES } from "../src/domain/governance.js";
import { demoUsers } from "../src/application/modules/admin/seedData.js";
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
