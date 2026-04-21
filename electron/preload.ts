import { contextBridge, ipcRenderer } from "electron";
import type { Correspondence } from "../src/domain/correspondence";
import type { NotificationPayload } from "../src/platform/contracts/INotificationService";

contextBridge.exposeInMainWorld("electronAPI", {
  correspondences: {
    findById: (id: string) => ipcRenderer.invoke("correspondences:findById", id),
    findAll: () => ipcRenderer.invoke("correspondences:findAll"),
    findByBranch: (branchId: string) =>
      ipcRenderer.invoke("correspondences:findByBranch", branchId),
    save: (c: Correspondence) => ipcRenderer.invoke("correspondences:save", c),
    update: (id: string, changes: Partial<Omit<Correspondence, "id">>) =>
      ipcRenderer.invoke("correspondences:update", id, changes)
  },
  users: {
    findById: (id: string) => ipcRenderer.invoke("users:findById", id),
    findAll: () => ipcRenderer.invoke("users:findAll"),
    findByBranch: (branchId: string) => ipcRenderer.invoke("users:findByBranch", branchId),
    save: (user: import("../src/domain/governance").AppUser) => ipcRenderer.invoke("users:save", user),
    delete: (id: string) => ipcRenderer.invoke("users:delete", id)
  },
  branches: {
    findById: (id: string) => ipcRenderer.invoke("branches:findById", id),
    findAll: () => ipcRenderer.invoke("branches:findAll"),
    save: (branch: import("../src/domain/governance").Branch) => ipcRenderer.invoke("branches:save", branch),
    delete: (id: string) => ipcRenderer.invoke("branches:delete", id)
  },
  departments: {
    findById: (id: string) => ipcRenderer.invoke("departments:findById", id),
    findAll: () => ipcRenderer.invoke("departments:findAll"),
    save: (department: import("../src/domain/governance").Department) => ipcRenderer.invoke("departments:save", department),
    delete: (id: string) => ipcRenderer.invoke("departments:delete", id)
  },
  referenceConfigs: {
    findAll: () => ipcRenderer.invoke("referenceConfigs:findAll"),
    findActive: () => ipcRenderer.invoke("referenceConfigs:findActive")
  },
  notifications: {
    send: (payload: NotificationPayload) => ipcRenderer.invoke("notifications:send", payload)
  },
  sequenceStore: {
    next: (key: string) => ipcRenderer.invoke("sequenceStore:next", key)
  }
});
