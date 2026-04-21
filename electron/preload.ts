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
    findByBranch: (branchId: string) => ipcRenderer.invoke("users:findByBranch", branchId)
  },
  branches: {
    findById: (id: string) => ipcRenderer.invoke("branches:findById", id),
    findAll: () => ipcRenderer.invoke("branches:findAll")
  },
  departments: {
    findById: (id: string) => ipcRenderer.invoke("departments:findById", id),
    findAll: () => ipcRenderer.invoke("departments:findAll")
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
