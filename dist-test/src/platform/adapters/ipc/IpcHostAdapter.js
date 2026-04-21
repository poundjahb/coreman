import "./electronApi.d.ts";
import { buildPlatformIndicator } from "../../platformIndicator";
export const sqlitePlatformIndicator = buildPlatformIndicator({
    target: "SQLITE",
    label: "SQLite (Electron)",
    initials: "SQ",
    backgroundColor: "#5742d6"
});
/**
 * Renderer-side host adapter. Each method delegates to the Electron main process
 * via the IPC bridge exposed by electron/preload.ts through contextBridge.
 *
 * Sequence generation is intentionally unavailable in the renderer — it is
 * handled by the main process when saving a correspondence.
 */
export function createIpcHostAdapter() {
    const api = window.electronAPI;
    return {
        platform: sqlitePlatformIndicator,
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
            findByBranch: (branchId) => api.users.findByBranch(branchId),
            save: (user) => api.users.save(user),
            delete: (id) => api.users.delete(id)
        },
        branches: {
            findById: (id) => api.branches.findById(id),
            findAll: () => api.branches.findAll(),
            save: (branch) => api.branches.save(branch),
            delete: (id) => api.branches.delete(id)
        },
        departments: {
            findById: (id) => api.departments.findById(id),
            findAll: () => api.departments.findAll(),
            save: (department) => api.departments.save(department),
            delete: (id) => api.departments.delete(id)
        },
        referenceConfigs: {
            findAll: () => api.referenceConfigs.findAll(),
            findActive: () => api.referenceConfigs.findActive()
        },
        notifications: {
            send: (payload) => api.notifications.send(payload)
        },
        sequenceStore: {
            next(_key) {
                throw new Error("sequenceStore.next is not available in the renderer process. " +
                    "Sequence generation is performed in the Electron main process.");
            }
        }
    };
}
