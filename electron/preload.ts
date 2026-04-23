import { contextBridge, ipcRenderer } from "electron";
import type { Correspondence } from "../src/domain/correspondence";
import type { CorrespondenceActionDefinition } from "../src/domain/correspondenceAction";
import type {
  CorrespondenceAuditEvent,
  CreateCorrespondenceAuditEvent
} from "../src/platform/contracts/ICorrespondenceAuditLogRepository";
import type { NotificationPayload } from "../src/platform/contracts/INotificationService";
import type { ExecutePostCaptureWorkflowCommand } from "../src/platform/contracts/IPostCaptureWorkflowService";
import type { SendTestEmailCommand } from "../src/platform/contracts/ISmtpSettingsService";
import type { SmtpConfig } from "../src/config/systemConfig";

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
  actionDefinitions: {
    findById: (id: string): Promise<CorrespondenceActionDefinition | null> =>
      ipcRenderer.invoke("actionDefinitions:findById", id),
    findAll: (): Promise<CorrespondenceActionDefinition[]> =>
      ipcRenderer.invoke("actionDefinitions:findAll"),
    findActive: (): Promise<CorrespondenceActionDefinition[]> =>
      ipcRenderer.invoke("actionDefinitions:findActive"),
    save: (definition: CorrespondenceActionDefinition) =>
      ipcRenderer.invoke("actionDefinitions:save", definition),
    delete: (id: string) => ipcRenderer.invoke("actionDefinitions:delete", id)
  },
  referenceConfigs: {
    findAll: () => ipcRenderer.invoke("referenceConfigs:findAll"),
    findActive: () => ipcRenderer.invoke("referenceConfigs:findActive")
  },
  smtpSettings: {
    getConfig: (): Promise<SmtpConfig> => ipcRenderer.invoke("smtpSettings:getConfig"),
    saveConfig: (config: SmtpConfig) => ipcRenderer.invoke("smtpSettings:saveConfig", config),
    sendTestEmail: (command: SendTestEmailCommand) => ipcRenderer.invoke("smtpSettings:sendTestEmail", command)
  },
  notifications: {
    send: (payload: NotificationPayload) => ipcRenderer.invoke("notifications:send", payload)
  },
  correspondenceAuditLog: {
    append: (event: CreateCorrespondenceAuditEvent): Promise<CorrespondenceAuditEvent> =>
      ipcRenderer.invoke("correspondenceAuditLog:append", event),
    findByCorrespondence: (correspondenceId: string): Promise<CorrespondenceAuditEvent[]> =>
      ipcRenderer.invoke("correspondenceAuditLog:findByCorrespondence", correspondenceId)
  },
  postCaptureWorkflow: {
    execute: (command: ExecutePostCaptureWorkflowCommand) =>
      ipcRenderer.invoke("postCaptureWorkflow:execute", command)
  },
  sequenceStore: {
    next: (key: string) => ipcRenderer.invoke("sequenceStore:next", key)
  }
});
