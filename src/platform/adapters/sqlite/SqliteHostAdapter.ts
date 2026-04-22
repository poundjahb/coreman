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
import type { ICorrespondenceAuditLogRepository } from "../../contracts/ICorrespondenceAuditLogRepository";
import type { IPostCaptureWorkflowService } from "../../contracts/IPostCaptureWorkflowService";

const pendingCorrespondenceAuditLog: ICorrespondenceAuditLogRepository = {
  append: async () => {
    throw new Error("Sqlite correspondence audit log is not implemented yet.");
  },
  findByCorrespondence: async () => []
};

const pendingPostCaptureWorkflow: IPostCaptureWorkflowService = {
  execute: async () => {
    throw new Error("Sqlite post-capture workflow is not implemented yet.");
  }
};

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
export function createSqliteHostAdapter(dbPath: string): IHostAdapter {
  const db = openDatabase(dbPath);
  return {
    platform: sqliteMainProcessPlatformIndicator,
    correspondences: new SqliteCorrespondenceRepository(db),
    users: new SqliteUserRepository(db),
    branches: new SqliteBranchRepository(db),
    departments: new SqliteDepartmentRepository(db),
    referenceConfigs: new SqliteReferenceConfigRepository(db),
    notifications: new SqliteNotificationService(db),
    correspondenceAuditLog: pendingCorrespondenceAuditLog,
    postCaptureWorkflow: pendingPostCaptureWorkflow,
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
    notifications: { send: () => notReady("send") },
    correspondenceAuditLog: {
      append: () => notReady("append"),
      findByCorrespondence: () => notReady("findByCorrespondence")
    },
    postCaptureWorkflow: { execute: () => notReady("execute") },
    sequenceStore: { next: () => notReady("next") }
  };
})();
