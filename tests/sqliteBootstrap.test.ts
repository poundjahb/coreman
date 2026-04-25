import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { getRuntimeSmtpConfig } from "../src/config/systemConfig";
import { createSqliteHostAdapter } from "../src/platform/adapters/sqlite/SqliteHostAdapter";

test("SQLite clean install bootstraps minimal required records", async () => {
  const tempDir = mkdtempSync(join(tmpdir(), "coreman-bootstrap-"));
  const dbPath = join(tempDir, "coreman.db");
  let adapter: (ReturnType<typeof createSqliteHostAdapter> & { close?: () => void }) | null = null;

  try {
    adapter = createSqliteHostAdapter(dbPath) as ReturnType<typeof createSqliteHostAdapter> & { close?: () => void };
    const [users, branches, departments, configs, correspondences, actionDefinitions, smtpConfig] = await Promise.all([
      adapter.users.findAll(),
      adapter.branches.findAll(),
      adapter.departments.findAll(),
      adapter.referenceConfigs.findActive(),
      adapter.correspondences.findAll(),
      adapter.actionDefinitions.findAll(),
      adapter.smtpSettings.getConfig()
    ]);

    assert.equal(branches.length, 1);
    assert.equal(branches[0]?.code, "MAIN");

    assert.equal(departments.length, 1);
    assert.equal(departments[0]?.code, "ADMIN");

    assert.equal(users.length, 1);
    assert.equal(users[0]?.email, "admin@coreman.com");
    assert.ok(users[0]?.roles.includes("ADMIN"));
    assert.ok(users[0]?.canLogin);

    assert.equal(configs.length, 1);
    assert.equal(configs[0]?.scope, "GLOBAL");

    assert.equal(correspondences.length, 0);
    assert.equal(actionDefinitions.length, 0);

    assert.deepEqual(smtpConfig, getRuntimeSmtpConfig());
  } finally {
    adapter?.close?.();
    rmSync(tempDir, { recursive: true, force: true });
  }
});