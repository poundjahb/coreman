import type { IHostAdapter } from "../../IHostAdapter";
import "./electronApi.d.ts";

/**
 * Renderer-side host adapter. Each method delegates to the Electron main process
 * via the IPC bridge exposed by electron/preload.ts through contextBridge.
 *
 * Sequence generation is intentionally unavailable in the renderer — it is
 * handled by the main process when saving a correspondence.
 */
export function createIpcHostAdapter(): IHostAdapter {
  const api = window.electronAPI;
  return {
    correspondences: {
      findById: (id) => api.correspondences.findById(id),
      findAll: () => api.correspondences.findAll(),
      findByBranch: (branchId) => api.correspondences.findByBranch(branchId),
      save: (c) => api.correspondences.save(c),
      update: (id, changes) => api.correspondences.update(id, changes)
    },
    users: {
      findById: (id) => api.users.findById(id),
      findAll: () => api.users.findAll(),
      findByBranch: (branchId) => api.users.findByBranch(branchId)
    },
    branches: {
      findById: (id) => api.branches.findById(id),
      findAll: () => api.branches.findAll()
    },
    departments: {
      findById: (id) => api.departments.findById(id),
      findAll: () => api.departments.findAll()
    },
    referenceConfigs: {
      findAll: () => api.referenceConfigs.findAll(),
      findActive: () => api.referenceConfigs.findActive()
    },
    notifications: {
      send: (payload) => api.notifications.send(payload)
    },
    sequenceStore: {
      next(_key: string): number {
        throw new Error(
          "sequenceStore.next is not available in the renderer process. " +
            "Sequence generation is performed in the Electron main process."
        );
      }
    }
  };
}
