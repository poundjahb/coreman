import type { PlatformTarget } from "../config/systemConfig";
import type { IHostAdapter } from "./IHostAdapter";
import { createInMemoryHostAdapter } from "./adapters/inMemory/InMemoryHostAdapter";
import { dataverseHostAdapter } from "./adapters/dataverse/DataverseHostAdapter";
import { createIpcHostAdapter } from "./adapters/ipc/IpcHostAdapter";

/**
 * Returns the appropriate host adapter for the current platform target.
 *
 * SQLITE  → IPC adapter (renderer delegates all persistence to Electron main process)
 * IN_MEMORY → fully wired in-memory adapter (browser / demo mode)
 * DATAVERSE → Dataverse adapter stub (Power Platform target)
 *
 * The Electron main process itself bypasses this factory and calls
 * createSqliteHostAdapter(dbPath) directly.
 */
export function createHostAdapter(target: PlatformTarget): IHostAdapter {
  switch (target) {
    case "DATAVERSE":
      return dataverseHostAdapter;
    case "SQLITE":
      return createIpcHostAdapter();
    case "IN_MEMORY":
      return createInMemoryHostAdapter();
  }
}
