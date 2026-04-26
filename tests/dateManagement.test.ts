import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import Database from "better-sqlite3";
import { createSqliteHostAdapter } from "../src/platform/adapters/sqlite/SqliteHostAdapter";
import {
  getStoredDateManagementSettings,
  saveDateManagementSettings,
  validateDateManagementSettingsPayload
} from "../src/platform/adapters/sqlite/server/src/routes/dateManagement";
import {
  defaultDateManagementThresholds,
  validateDateManagementThresholds
} from "../src/domain/dateManagement";

function initDateManagementSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS date_management_settings (
      id INTEGER PRIMARY KEY CHECK(id = 1),
      assignmentReminderDays INTEGER NOT NULL,
      assignmentEscalationDays INTEGER NOT NULL,
      assignmentAutoCloseDays INTEGER NOT NULL,
      recipientInactionReminderDays INTEGER NOT NULL,
      recipientInactionEscalationDays INTEGER NOT NULL,
      recipientInactionAutoCloseDays INTEGER NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `);
}

test("date management validation enforces non-negative and ordering rules", () => {
  const errors = validateDateManagementThresholds({
    assignmentThresholds: {
      reminderDays: 4,
      escalationDays: 3,
      autoCloseDays: 2
    },
    recipientInactionThresholds: {
      reminderDays: -1,
      escalationDays: 1,
      autoCloseDays: 3
    }
  });

  assert.ok(errors.length >= 2);
  assert.ok(errors.some((error) => error.includes("assignmentThresholds.reminderDays")));
  assert.ok(errors.some((error) => error.includes("recipientInactionThresholds.reminderDays")));
});

test("sqlite host adapter persists date management thresholds", async () => {
  const tempDir = mkdtempSync(join(tmpdir(), "coreman-date-management-"));
  const dbPath = join(tempDir, "coreman.db");
  let adapter: (ReturnType<typeof createSqliteHostAdapter> & { close?: () => void }) | null = null;

  try {
    adapter = createSqliteHostAdapter(dbPath) as ReturnType<typeof createSqliteHostAdapter> & { close?: () => void };

    const defaults = await adapter.dateManagement.getThresholds();
    assert.deepEqual(defaults, defaultDateManagementThresholds);

    const updated = {
      assignmentThresholds: {
        reminderDays: 1,
        escalationDays: 3,
        autoCloseDays: 7
      },
      recipientInactionThresholds: {
        reminderDays: 2,
        escalationDays: 4,
        autoCloseDays: 8
      }
    };

    await adapter.dateManagement.saveThresholds(updated);

    const reloaded = await adapter.dateManagement.getThresholds();
    assert.deepEqual(reloaded, updated);
  } finally {
    adapter?.close?.();
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("date management API logic returns defaults, rejects invalid ordering, and persists valid payload", async () => {
  const db = new Database(":memory:");
  initDateManagementSchema(db);

  try {
    const defaultsPayload = getStoredDateManagementSettings(db);
    assert.deepEqual(defaultsPayload, defaultDateManagementThresholds);

    const invalidValidation = validateDateManagementSettingsPayload({
      assignmentThresholds: {
        reminderDays: 5,
        escalationDays: 3,
        autoCloseDays: 9
      },
      recipientInactionThresholds: {
        reminderDays: 1,
        escalationDays: 2,
        autoCloseDays: 3
      }
    });
    assert.equal(invalidValidation.value, null);
    assert.ok(invalidValidation.errors.length > 0);

    const validPayload = {
      assignmentThresholds: {
        reminderDays: 2,
        escalationDays: 4,
        autoCloseDays: 8
      },
      recipientInactionThresholds: {
        reminderDays: 1,
        escalationDays: 2,
        autoCloseDays: 6
      }
    };
    const validValidation = validateDateManagementSettingsPayload(validPayload);
    assert.equal(validValidation.errors.length, 0);
    assert.ok(validValidation.value);

    saveDateManagementSettings(db, validPayload);

    const persistedPayload = getStoredDateManagementSettings(db);
    assert.deepEqual(persistedPayload, validPayload);
  } finally {
    db.close();
  }
});
