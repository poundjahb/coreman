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
  actionDefinitions: {
    findById: (id) => ipcRenderer.invoke("actionDefinitions:findById", id),
    findAll: () => ipcRenderer.invoke("actionDefinitions:findAll"),
    findActive: () => ipcRenderer.invoke("actionDefinitions:findActive"),
    save: (definition) => ipcRenderer.invoke("actionDefinitions:save", definition),
    delete: (id) => ipcRenderer.invoke("actionDefinitions:delete", id)
  },
  referenceConfigs: {
    findAll: () => ipcRenderer.invoke("referenceConfigs:findAll"),
    findActive: () => ipcRenderer.invoke("referenceConfigs:findActive")
  },
  smtpSettings: {
    getConfig: () => ipcRenderer.invoke("smtpSettings:getConfig"),
    saveConfig: (config) => ipcRenderer.invoke("smtpSettings:saveConfig", config),
    sendTestEmail: (command) => ipcRenderer.invoke("smtpSettings:sendTestEmail", command)
  },
  notifications: {
    send: (payload) => ipcRenderer.invoke("notifications:send", payload)
  },
  correspondenceAuditLog: {
    append: (event) => ipcRenderer.invoke("correspondenceAuditLog:append", event),
    findByCorrespondence: (correspondenceId) => ipcRenderer.invoke("correspondenceAuditLog:findByCorrespondence", correspondenceId)
  },
  postCaptureWorkflow: {
    execute: (command) => ipcRenderer.invoke("postCaptureWorkflow:execute", command)
  },
  sequenceStore: {
    next: (key) => ipcRenderer.invoke("sequenceStore:next", key)
  }
});
