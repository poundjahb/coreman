import type { SequenceStore } from "../domain/reference";
import type { PlatformTarget } from "../config/systemConfig";
import type { IBranchRepository } from "./contracts/IBranchRepository";
import type { ICorrespondenceRepository } from "./contracts/ICorrespondenceRepository";
import type { IDepartmentRepository } from "./contracts/IDepartmentRepository";
import type { ICorrespondenceAuditLogRepository } from "./contracts/ICorrespondenceAuditLogRepository";
import type { INotificationService } from "./contracts/INotificationService";
import type { IPostCaptureWorkflowService } from "./contracts/IPostCaptureWorkflowService";
import type { IReferenceConfigRepository } from "./contracts/IReferenceConfigRepository";
import type { ISmtpSettingsService } from "./contracts/ISmtpSettingsService";
import type { IUserRepository } from "./contracts/IUserRepository";

export interface PlatformIndicator {
  target: PlatformTarget;
  label: string;
  iconDataUrl: string;
}

export interface IHostAdapter {
  platform: PlatformIndicator;
  correspondences: ICorrespondenceRepository;
  users: IUserRepository;
  branches: IBranchRepository;
  departments: IDepartmentRepository;
  referenceConfigs: IReferenceConfigRepository;
  smtpSettings: ISmtpSettingsService;
  notifications: INotificationService;
  correspondenceAuditLog: ICorrespondenceAuditLogRepository;
  postCaptureWorkflow: IPostCaptureWorkflowService;
  sequenceStore: SequenceStore;
}
