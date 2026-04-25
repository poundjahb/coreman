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
import type { IEmailService } from "./contracts/IEmailService";
import type { IUserRepository } from "./contracts/IUserRepository";
import type { ICorrespondenceActionDefinitionRepository } from "./contracts/ICorrespondenceActionDefinitionRepository";
import type { ICorrespondenceTaskAssignmentRepository } from "./contracts/ICorrespondenceTaskAssignmentRepository";
import type { IWorkflowPluginService } from "./contracts/IWorkflowPluginService";

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
  actionDefinitions: ICorrespondenceActionDefinitionRepository;
  taskAssignments: ICorrespondenceTaskAssignmentRepository;
  referenceConfigs: IReferenceConfigRepository;
  smtpSettings: ISmtpSettingsService;
  emailSettings: IEmailService;
  notifications: INotificationService;
  correspondenceAuditLog: ICorrespondenceAuditLogRepository;
  postCaptureWorkflow: IPostCaptureWorkflowService;
  workflowPlugins: IWorkflowPluginService;
  sequenceStore: SequenceStore;
}
