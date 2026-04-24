import type { IHostAdapter } from "../../IHostAdapter";
import type { ICorrespondenceRepository } from "../../contracts/ICorrespondenceRepository";
import type { IUserRepository } from "../../contracts/IUserRepository";
import type { IBranchRepository } from "../../contracts/IBranchRepository";
import type { IDepartmentRepository } from "../../contracts/IDepartmentRepository";
import type { IReferenceConfigRepository } from "../../contracts/IReferenceConfigRepository";
import type { INotificationService, NotificationPayload } from "../../contracts/INotificationService";
import type { ICorrespondenceAuditLogRepository } from "../../contracts/ICorrespondenceAuditLogRepository";
import type { IPostCaptureWorkflowService } from "../../contracts/IPostCaptureWorkflowService";
import type { ISmtpSettingsService } from "../../contracts/ISmtpSettingsService";
import type { IEmailService } from "../../contracts/IEmailService";
import type { SequenceStore } from "../../../domain/reference";
import type { ICorrespondenceActionDefinitionRepository } from "../../contracts/ICorrespondenceActionDefinitionRepository";
import type { ICorrespondenceTaskAssignmentRepository } from "../../contracts/ICorrespondenceTaskAssignmentRepository";
import { buildPlatformIndicator } from "../../platformIndicator";

export const dataversePlatformIndicator = buildPlatformIndicator({
  target: "DATAVERSE",
  label: "Dataverse",
  initials: "DV",
  backgroundColor: "#1366d9"
});

function notImplemented(method: string): never {
  throw new Error(`DataverseHostAdapter: ${method} is not yet implemented.`);
}

const dataverseCorrespondenceRepository: ICorrespondenceRepository = {
  findById: (_id) => notImplemented("correspondences.findById"),
  findAll: () => notImplemented("correspondences.findAll"),
  findByBranch: (_branchId) => notImplemented("correspondences.findByBranch"),
  save: (_c) => notImplemented("correspondences.save"),
  update: (_id, _changes) => notImplemented("correspondences.update")
};

const dataverseUserRepository: IUserRepository = {
  findById: (_id) => notImplemented("users.findById"),
  findAll: () => notImplemented("users.findAll"),
  findByBranch: (_branchId) => notImplemented("users.findByBranch"),
  save: (_user) => notImplemented("users.save"),
  delete: (_id) => notImplemented("users.delete")
};

const dataverseBranchRepository: IBranchRepository = {
  findById: (_id) => notImplemented("branches.findById"),
  findAll: () => notImplemented("branches.findAll"),
  save: (_branch) => notImplemented("branches.save"),
  delete: (_id) => notImplemented("branches.delete")
};

const dataverseDepartmentRepository: IDepartmentRepository = {
  findById: (_id) => notImplemented("departments.findById"),
  findAll: () => notImplemented("departments.findAll"),
  save: (_department) => notImplemented("departments.save"),
  delete: (_id) => notImplemented("departments.delete")
};

const dataverseReferenceConfigRepository: IReferenceConfigRepository = {
  findAll: () => notImplemented("referenceConfigs.findAll"),
  findActive: () => notImplemented("referenceConfigs.findActive")
};

const dataverseActionDefinitionRepository: ICorrespondenceActionDefinitionRepository = {
  findById: (_id) => notImplemented("actionDefinitions.findById"),
  findAll: () => notImplemented("actionDefinitions.findAll"),
  findActive: () => notImplemented("actionDefinitions.findActive"),
  save: (_definition) => notImplemented("actionDefinitions.save"),
  delete: (_id) => notImplemented("actionDefinitions.delete")
};

const dataverseTaskAssignmentRepository: ICorrespondenceTaskAssignmentRepository = {
  findById: (_id) => notImplemented("taskAssignments.findById"),
  findByCorrespondence: (_correspondenceId) => notImplemented("taskAssignments.findByCorrespondence"),
  findByAssignee: (_assigneeUserId) => notImplemented("taskAssignments.findByAssignee"),
  save: (_assignment) => notImplemented("taskAssignments.save"),
  update: (_id, _changes) => notImplemented("taskAssignments.update")
};

const dataverseNotificationService: INotificationService = {
  send: (_payload: NotificationPayload) => notImplemented("notifications.send")
};

const dataverseSequenceStore: SequenceStore = {
  next: (_key: string) => notImplemented("sequenceStore.next")
};

const dataverseAuditLog: ICorrespondenceAuditLogRepository = {
  append: () => notImplemented("correspondenceAuditLog.append"),
  findByCorrespondence: () => notImplemented("correspondenceAuditLog.findByCorrespondence")
};

const dataversePostCaptureWorkflow: IPostCaptureWorkflowService = {
  execute: () => notImplemented("postCaptureWorkflow.execute")
};

const dataverseSmtpSettings: ISmtpSettingsService = {
  getConfig: () => notImplemented("smtpSettings.getConfig"),
  saveConfig: () => notImplemented("smtpSettings.saveConfig"),
  sendTestEmail: () => notImplemented("smtpSettings.sendTestEmail")
};

const dataverseEmailSettings: IEmailService = {
  getConfig: () => notImplemented("emailSettings.getConfig"),
  saveConfig: () => notImplemented("emailSettings.saveConfig"),
  sendTestEmail: () => notImplemented("emailSettings.sendTestEmail"),
  sendEmail: () => notImplemented("emailSettings.sendEmail")
};

export const dataverseHostAdapter: IHostAdapter = {
  platform: dataversePlatformIndicator,
  correspondences: dataverseCorrespondenceRepository,
  users: dataverseUserRepository,
  branches: dataverseBranchRepository,
  departments: dataverseDepartmentRepository,
  actionDefinitions: dataverseActionDefinitionRepository,
  taskAssignments: dataverseTaskAssignmentRepository,
  referenceConfigs: dataverseReferenceConfigRepository,
  smtpSettings: dataverseSmtpSettings,
  emailSettings: dataverseEmailSettings,
  notifications: dataverseNotificationService,
  correspondenceAuditLog: dataverseAuditLog,
  postCaptureWorkflow: dataversePostCaptureWorkflow,
  sequenceStore: dataverseSequenceStore
};
