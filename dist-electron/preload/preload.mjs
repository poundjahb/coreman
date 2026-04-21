import { contextBridge, ipcRenderer } from "electron";
contextBridge.exposeInMainWorld("electronAPI", {
  correspondences: {
    findById: (id) => ipcRenderer.invoke("correspondences:findById", id),
    findAll: () => ipcRenderer.invoke("correspondences:findAll"),
    findByBranch: (branchId) => ipcRenderer.invoke("correspondences:findByBranch", branchId),
    save: (c) => ipcRenderer.invoke("correspondences:save", c),
    update: (id, changes) => ipcRenderer.invoke("correspondences:update", id, changes)
  },
  users: {
    findById: (id) => ipcRenderer.invoke("users:findById", id),
    findAll: () => ipcRenderer.invoke("users:findAll"),
    findByBranch: (branchId) => ipcRenderer.invoke("users:findByBranch", branchId),
    save: (user) => ipcRenderer.invoke("users:save", user),
    delete: (id) => ipcRenderer.invoke("users:delete", id)
  },
  branches: {
    findById: (id) => ipcRenderer.invoke("branches:findById", id),
    findAll: () => ipcRenderer.invoke("branches:findAll"),
    save: (branch) => ipcRenderer.invoke("branches:save", branch),
    delete: (id) => ipcRenderer.invoke("branches:delete", id)
  },
  departments: {
    findById: (id) => ipcRenderer.invoke("departments:findById", id),
    findAll: () => ipcRenderer.invoke("departments:findAll"),
    save: (department) => ipcRenderer.invoke("departments:save", department),
    delete: (id) => ipcRenderer.invoke("departments:delete", id)
  },
  referenceConfigs: {
    findAll: () => ipcRenderer.invoke("referenceConfigs:findAll"),
    findActive: () => ipcRenderer.invoke("referenceConfigs:findActive")
  },
  notifications: {
    send: (payload) => ipcRenderer.invoke("notifications:send", payload)
  },
  sequenceStore: {
    next: (key) => ipcRenderer.invoke("sequenceStore:next", key)
  }
});
