import test from "node:test";
import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { executeWorkflowTrigger } from "../src/platform/adapters/sqlite/server/src/workflows/engine";
import { refreshWorkflowPlugins, validatePluginManifest } from "../src/platform/adapters/sqlite/server/src/workflows/discovery";
import { resolveWorkflowBinding } from "../src/platform/adapters/sqlite/server/src/workflows/types";

function createWorkflowDb(): Database.Database {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE workflow_plugins (
      pluginKey TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      version TEXT NOT NULL,
      apiVersion TEXT NOT NULL,
      platformTarget TEXT NOT NULL,
      supportedTriggersJson TEXT NOT NULL,
      entryFile TEXT NOT NULL,
      sourcePath TEXT NOT NULL,
      checksum TEXT NOT NULL,
      isEnabled INTEGER NOT NULL DEFAULT 1,
      isValid INTEGER NOT NULL DEFAULT 1,
      validationErrorsJson TEXT,
      discoveredAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE TABLE workflow_bindings (
      id TEXT PRIMARY KEY,
      bindingType TEXT NOT NULL,
      triggerCode TEXT,
      actionDefinitionId TEXT,
      pluginKey TEXT NOT NULL,
      priority INTEGER NOT NULL DEFAULT 100,
      isActive INTEGER NOT NULL DEFAULT 1,
      createdBy TEXT NOT NULL,
      updatedBy TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE TABLE correspondence_audit_log (
      id TEXT PRIMARY KEY,
      correspondenceId TEXT NOT NULL,
      eventType TEXT NOT NULL,
      status TEXT NOT NULL,
      payloadJson TEXT,
      errorMessage TEXT,
      details TEXT,
      createdAt TEXT NOT NULL,
      createdById TEXT,
      createdBy TEXT NOT NULL
    );
    CREATE TABLE correspondences (
      id TEXT PRIMARY KEY,
      referenceNumber TEXT,
      subject TEXT
    );
    CREATE TABLE action_definitions (
      id TEXT PRIMARY KEY,
      code TEXT,
      label TEXT
    );
    CREATE TABLE notifications (
      id TEXT PRIMARY KEY,
      recipientId TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      correspondenceId TEXT,
      sentAt TEXT NOT NULL
    );
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      email TEXT
    );
    CREATE TABLE email_settings (
      id INTEGER PRIMARY KEY,
      backendType TEXT NOT NULL,
      config TEXT NOT NULL,
      fromAddress TEXT NOT NULL
    );
  `);
  return db;
}

test("validatePluginManifest rejects incompatible API versions", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "coreman-plugin-manifest-"));
  try {
    writeFileSync(join(tempDir, "index.mjs"), "export const metadata = {}; export async function execute() {}\n");

    const { manifest, errors } = validatePluginManifest(
      {
        pluginKey: "notify-owner",
        name: "Notify Owner",
        description: "Sends notifications",
        version: "1.0.0",
        apiVersion: "2.0",
        platformTarget: "SERVER",
        supportedTriggers: ["CORRESPONDENCE_CREATED"],
        entryFile: "index.mjs",
        enabledByDefault: true
      },
      tempDir,
      "1.x",
      "SERVER"
    );

    assert.equal(manifest, null);
    assert.match(errors.join(" "), /not compatible/i);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("refreshWorkflowPlugins discovers valid and invalid plugins", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "coreman-plugin-refresh-"));
  const previousRoot = process.env.COREMAN_WORKFLOW_PLUGIN_ROOT;
  const previousTarget = process.env.COREMAN_WORKFLOW_PLATFORM_TARGET;
  const db = createWorkflowDb();

  try {
    const serverRoot = join(tempDir, "SERVER");
    mkdirSync(join(serverRoot, "notify-owner"), { recursive: true });
    mkdirSync(join(serverRoot, "broken-plugin"), { recursive: true });

    writeFileSync(
      join(serverRoot, "notify-owner", "plugin.json"),
      JSON.stringify({
        pluginKey: "notify-owner",
        name: "Notify Owner",
        description: "Sends a workflow notification",
        version: "1.0.0",
        apiVersion: "1.0",
        platformTarget: "SERVER",
        supportedTriggers: ["CORRESPONDENCE_CREATED"],
        entryFile: "index.mjs",
        enabledByDefault: true
      })
    );
    writeFileSync(
      join(serverRoot, "notify-owner", "index.mjs"),
      "export const metadata = { pluginKey: 'notify-owner' }; export async function execute() { return { delivered: true }; }\n"
    );
    writeFileSync(
      join(serverRoot, "broken-plugin", "plugin.json"),
      JSON.stringify({
        name: "Broken Plugin",
        description: "Missing key",
        version: "1.0.0",
        apiVersion: "1.0",
        platformTarget: "SERVER",
        supportedTriggers: [],
        entryFile: "index.mjs",
        enabledByDefault: false
      })
    );

    process.env.COREMAN_WORKFLOW_PLUGIN_ROOT = tempDir;
    process.env.COREMAN_WORKFLOW_PLATFORM_TARGET = "SERVER";

    const result = refreshWorkflowPlugins(db);
    assert.equal(result.discoveredCount, 2);
    assert.equal(result.invalidCount, 1);

    const plugins = db.prepare("SELECT pluginKey, isValid FROM workflow_plugins ORDER BY pluginKey ASC").all() as Array<{
      pluginKey: string;
      isValid: number;
    }>;
    assert.equal(plugins.length, 2);
    assert.deepEqual(
      plugins.map((plugin) => [plugin.pluginKey, plugin.isValid]),
      [
        ["invalid:SERVER:broken-plugin", 0],
        ["notify-owner", 1]
      ]
    );
  } finally {
    db.close();
    if (previousRoot === undefined) {
      delete process.env.COREMAN_WORKFLOW_PLUGIN_ROOT;
    } else {
      process.env.COREMAN_WORKFLOW_PLUGIN_ROOT = previousRoot;
    }
    if (previousTarget === undefined) {
      delete process.env.COREMAN_WORKFLOW_PLATFORM_TARGET;
    } else {
      process.env.COREMAN_WORKFLOW_PLATFORM_TARGET = previousTarget;
    }
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("executeWorkflowTrigger prefers ACTION bindings over EVENT bindings", async () => {
  const tempDir = mkdtempSync(join(tmpdir(), "coreman-plugin-engine-"));
  const db = createWorkflowDb();

  try {
    const pluginDir = join(tempDir, "action-plugin");
    mkdirSync(pluginDir, { recursive: true });
    writeFileSync(
      join(pluginDir, "index.mjs"),
      [
        "export const metadata = { pluginKey: 'action-plugin', name: 'Action Plugin' };",
        "export async function execute(context) {",
        "  return { resolvedTrigger: context.trigger.type, resolvedCode: context.trigger.code };",
        "}"
      ].join("\n")
    );

    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO workflow_plugins (
        pluginKey, name, description, version, apiVersion, platformTarget, supportedTriggersJson,
        entryFile, sourcePath, checksum, isEnabled, isValid, validationErrorsJson, discoveredAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      "action-plugin",
      "Action Plugin",
      "Executes an action binding",
      "1.0.0",
      "1.0",
      "SERVER",
      JSON.stringify(["ASSIGNMENT_CREATED", "action-123"]),
      "index.mjs",
      pluginDir,
      "checksum-1",
      1,
      1,
      JSON.stringify([]),
      now,
      now
    );
    db.prepare(
      `INSERT INTO workflow_bindings (
        id, bindingType, triggerCode, actionDefinitionId, pluginKey, priority, isActive, createdBy, updatedBy, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run("evt-1", "EVENT", "ASSIGNMENT_CREATED", null, "action-plugin", 200, 1, "admin", "admin", now, now);
    db.prepare(
      `INSERT INTO workflow_bindings (
        id, bindingType, triggerCode, actionDefinitionId, pluginKey, priority, isActive, createdBy, updatedBy, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run("act-1", "ACTION", null, "action-123", "action-plugin", 50, 1, "admin", "admin", now, now);

    const binding = resolveWorkflowBinding(db, { eventCode: "ASSIGNMENT_CREATED", actionDefinitionId: "action-123" });
    assert.equal(binding?.bindingType, "ACTION");
    assert.equal(binding?.actionDefinitionId, "action-123");

    const result = await executeWorkflowTrigger(db, {
      eventCode: "ASSIGNMENT_CREATED",
      actionDefinitionId: "action-123",
      correspondenceId: "corr-1",
      actorId: "admin"
    });

    assert.equal(result.status, "SUCCESS");
    assert.equal(result.output?.resolvedTrigger, "ACTION");
    assert.equal(result.output?.resolvedCode, "action-123");

    const audits = db.prepare("SELECT eventType FROM correspondence_audit_log ORDER BY createdAt ASC").all() as Array<{ eventType: string }>;
    assert.deepEqual(audits.map((row) => row.eventType), ["AGENT_CALL", "AGENT_RESPONSE"]);
  } finally {
    db.close();
    rmSync(tempDir, { recursive: true, force: true });
  }
});