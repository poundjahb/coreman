import type { IHostAdapter } from "../../IHostAdapter";
import { openDatabase } from "./SqliteDatabase";
import { SqliteCorrespondenceRepository } from "./SqliteCorrespondenceRepository";
import { SqliteUserRepository } from "./SqliteUserRepository";
import { SqliteBranchRepository } from "./SqliteBranchRepository";
import { SqliteDepartmentRepository } from "./SqliteDepartmentRepository";
import { SqliteReferenceConfigRepository } from "./SqliteReferenceConfigRepository";
import { SqliteNotificationService } from "./SqliteNotificationService";
import { SqliteSequenceStore } from "./SqliteSequenceStore";

/**
 * Creates a fully wired SQLite host adapter.
 * Call this from the Electron main process, passing the path to the .db file.
 */
export function createSqliteHostAdapter(dbPath: string): IHostAdapter {
  const db = openDatabase(dbPath);
  return {
    correspondences: new SqliteCorrespondenceRepository(db),
    users: new SqliteUserRepository(db),
    branches: new SqliteBranchRepository(db),
    departments: new SqliteDepartmentRepository(db),
    referenceConfigs: new SqliteReferenceConfigRepository(db),
    notifications: new SqliteNotificationService(db),
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
      findByBranch: () => notReady("findByBranch")
    },
    branches: { findById: () => notReady("findById"), findAll: () => notReady("findAll") },
    departments: { findById: () => notReady("findById"), findAll: () => notReady("findAll") },
    referenceConfigs: { findAll: () => notReady("findAll"), findActive: () => notReady("findActive") },
    notifications: { send: () => notReady("send") },
    sequenceStore: { next: () => notReady("next") }
  };
})();
