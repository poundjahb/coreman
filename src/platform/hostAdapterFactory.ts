import type { PlatformTarget } from "../config/systemConfig";
import type { IHostAdapter, PlatformIndicator } from "./IHostAdapter";
import { createInMemoryHostAdapter, inMemoryPlatformIndicator } from "./adapters/inMemory/InMemoryHostAdapter";
import { dataverseHostAdapter, dataversePlatformIndicator } from "./adapters/dataverse/DataverseHostAdapter";
import { createIpcHostAdapter, sqlitePlatformIndicator } from "./adapters/ipc/IpcHostAdapter";
import { createHttpHostAdapter, serverPlatformIndicator } from "./adapters/http/HttpHostAdapter";

/**
 * Returns the appropriate host adapter for the current platform target.
 *
 * SQLITE  → IPC adapter (renderer delegates all persistence to Electron main process via window.electronAPI).
 *           REQUIRED: Must be run inside Electron. Will throw if bridge is unavailable.
 *           NO FALLBACK: Cannot degrade to IN_MEMORY; strict platform enforcement.
 * SERVER  → HTTP adapter (renderer delegates persistence to centralized backend API).
 * IN_MEMORY → fully wired in-memory adapter (browser / demo mode, no Electron required)
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
      // Strict mode: SQLITE requires Electron bridge. No fallback to IN_MEMORY.
      // If you see an error here, run the app through Electron (Start-sqlite.ps1),
      // not through the browser (npm run dev).
      return createIpcHostAdapter();
    case "SERVER":
      return createHttpHostAdapter();
    case "IN_MEMORY":
      return createInMemoryHostAdapter();
  }
}

export function getPlatformIndicator(target: PlatformTarget): PlatformIndicator {
  switch (target) {
    case "DATAVERSE":
      return dataversePlatformIndicator;
    case "SQLITE":
      return sqlitePlatformIndicator;
    case "SERVER":
      return serverPlatformIndicator;
    case "IN_MEMORY":
      return inMemoryPlatformIndicator;
  }
}
