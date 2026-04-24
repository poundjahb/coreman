import type { IHostAdapter } from "../../IHostAdapter";
import { openDatabase } from "./SqliteDatabase";
import { SqliteCorrespondenceRepository } from "./SqliteCorrespondenceRepository";
import { SqliteUserRepository } from "./SqliteUserRepository";
import { SqliteBranchRepository } from "./SqliteBranchRepository";
import { SqliteDepartmentRepository } from "./SqliteDepartmentRepository";
import { SqliteReferenceConfigRepository } from "./SqliteReferenceConfigRepository";
import { SqliteNotificationService } from "./SqliteNotificationService";
import { SqliteSequenceStore } from "./SqliteSequenceStore";
import { buildPlatformIndicator } from "../../platformIndicator";
import { SqliteCorrespondenceAuditLogRepository } from "./SqliteCorrespondenceAuditLogRepository";
import { SqlitePostCaptureWorkflowService } from "./SqlitePostCaptureWorkflowService";
import { SqliteSmtpSettingsService } from "./SqliteSmtpSettingsService";
import { SqliteCorrespondenceActionDefinitionRepository } from "./SqliteCorrespondenceActionDefinitionRepository";

export const sqliteMainProcessPlatformIndicator = buildPlatformIndicator({
  target: "SQLITE",
  label: "SQLite (Main)",
  initials: "SQ",
  backgroundColor: "#5742d6"
});

/**
 * Creates a fully wired SQLite host adapter.
 * Call this from the Electron main process, passing the path to the .db file.
 */
export function createSqliteHostAdapter(
  dbPath: string
): IHostAdapter {
  const db = openDatabase(dbPath);
  const smtpSettings = new SqliteSmtpSettingsService(db);
  const notifications = new SqliteNotificationService(db, smtpSettings);
  const correspondenceAuditLog = new SqliteCorrespondenceAuditLogRepository(db);

  return {
    platform: sqliteMainProcessPlatformIndicator,
    correspondences: new SqliteCorrespondenceRepository(db),
    users: new SqliteUserRepository(db),
    branches: new SqliteBranchRepository(db),
    departments: new SqliteDepartmentRepository(db),
    actionDefinitions: new SqliteCorrespondenceActionDefinitionRepository(db),
    taskAssignments: {
      findById: () => notReady("taskAssignments.findById"),
      findByCorrespondence: () => notReady("taskAssignments.findByCorrespondence"),
      findByAssignee: () => notReady("taskAssignments.findByAssignee"),
      save: () => notReady("taskAssignments.save"),
      update: () => notReady("taskAssignments.update")
    },
    referenceConfigs: new SqliteReferenceConfigRepository(db),
    smtpSettings,
    notifications,
    correspondenceAuditLog,
    postCaptureWorkflow: new SqlitePostCaptureWorkflowService(notifications, correspondenceAuditLog),
    sequenceStore: new SqliteSequenceStore(db)
  };
}

/**
 * Placeholder exported for hostAdapterFactory compatibility.
 * Replace with createSqliteHostAdapter(dbPath) once Electron main process is wired.
 */
export const sqliteHostAdapter: IHostAdapter = (() => {
  function notReady(method: string): never {
    throw new Error(`SqliteHostAdapter: call createSqliteHostAdapter(dbPath) — ${method} unavailable`);
  }
  return {
    platform: sqliteMainProcessPlatformIndicator,
    correspondences: {
      findById: () => notReady("findById"),
      findAll: () => notReady("findAll"),
      findByBranch: () => notReady("findByBranch"),
      save: () => notReady("save"),
      update: () => notReady("update")
    },
    users: {
      findById: () => notReady("findById"),
      findAll: () => notReady("findAll"),
      findByBranch: () => notReady("findByBranch"),
      save: () => notReady("save"),
      delete: () => notReady("delete")
    },
    branches: {
      findById: () => notReady("findById"),
      findAll: () => notReady("findAll"),
      save: () => notReady("save"),
      delete: () => notReady("delete")
    },
    departments: {
      findById: () => notReady("findById"),
      findAll: () => notReady("findAll"),
      save: () => notReady("save"),
      delete: () => notReady("delete")
    },
    referenceConfigs: { findAll: () => notReady("findAll"), findActive: () => notReady("findActive") },
    actionDefinitions: {
      findById: () => notReady("actionDefinitions.findById"),
      findAll: () => notReady("actionDefinitions.findAll"),
      findActive: () => notReady("actionDefinitions.findActive"),
      save: () => notReady("actionDefinitions.save"),
      delete: () => notReady("actionDefinitions.delete")
    },
    taskAssignments: {
      findById: () => notReady("taskAssignments.findById"),
      findByCorrespondence: () => notReady("taskAssignments.findByCorrespondence"),
      findByAssignee: () => notReady("taskAssignments.findByAssignee"),
      save: () => notReady("taskAssignments.save"),
      update: () => notReady("taskAssignments.update")
    },
    smtpSettings: {
      getConfig: () => notReady("smtpSettings.getConfig"),
      saveConfig: () => notReady("smtpSettings.saveConfig"),
      sendTestEmail: () => notReady("smtpSettings.sendTestEmail")
    },
    notifications: { send: () => notReady("send") },
    correspondenceAuditLog: {
      append: () => notReady("append"),
      findByCorrespondence: () => notReady("findByCorrespondence")
    },
    postCaptureWorkflow: { execute: () => notReady("execute") },
    sequenceStore: { next: () => notReady("next") }
  };
})();
