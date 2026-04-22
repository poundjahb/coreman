import type { Correspondence } from "../../../domain/correspondence";
import type { AppUser, Branch, Department } from "../../../domain/governance";
import type { ReferenceFormatConfig } from "../../../domain/reference";
import type {
  CorrespondenceAuditEvent,
  CreateCorrespondenceAuditEvent
} from "../../contracts/ICorrespondenceAuditLogRepository";
import type { NotificationPayload } from "../../contracts/INotificationService";
import type { ExecutePostCaptureWorkflowCommand } from "../../contracts/IPostCaptureWorkflowService";

/**
 * Shape of window.electronAPI injected by electron/preload.ts via contextBridge.
 * Used by TypeScript in the renderer process.
 */
export interface ElectronAPI {
  correspondences: {
    findById(id: string): Promise<Correspondence | null>;
    findAll(): Promise<Correspondence[]>;
    findByBranch(branchId: string): Promise<Correspondence[]>;
    save(c: Correspondence): Promise<void>;
    update(id: string, changes: Partial<Omit<Correspondence, "id">>): Promise<void>;
  };
  users: {
    findById(id: string): Promise<AppUser | null>;
    findAll(): Promise<AppUser[]>;
    findByBranch(branchId: string): Promise<AppUser[]>;
    save(user: AppUser): Promise<void>;
    delete(id: string): Promise<void>;
  };
  branches: {
    findById(id: string): Promise<Branch | null>;
    findAll(): Promise<Branch[]>;
    save(branch: Branch): Promise<void>;
    delete(id: string): Promise<void>;
  };
  departments: {
    findById(id: string): Promise<Department | null>;
    findAll(): Promise<Department[]>;
    save(department: Department): Promise<void>;
    delete(id: string): Promise<void>;
  };
  referenceConfigs: {
    findAll(): Promise<ReferenceFormatConfig[]>;
    findActive(): Promise<ReferenceFormatConfig[]>;
  };
  notifications: {
    send(payload: NotificationPayload): Promise<void>;
  };
  correspondenceAuditLog: {
    append(event: CreateCorrespondenceAuditEvent): Promise<CorrespondenceAuditEvent>;
    findByCorrespondence(correspondenceId: string): Promise<CorrespondenceAuditEvent[]>;
  };
  postCaptureWorkflow: {
    execute(command: ExecutePostCaptureWorkflowCommand): Promise<void>;
  };
  sequenceStore: {
    next(key: string): Promise<number>;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
