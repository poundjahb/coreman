import { InMemorySequenceStore } from "../../../application/services/referenceEngine";
import {
  demoBranches,
  demoCorrespondences,
  demoDepartments,
  demoReferenceConfigs,
  demoUsers
} from "../../../application/modules/admin/seedData";
import type { IHostAdapter } from "../../IHostAdapter";
import { InMemoryBranchRepository } from "./InMemoryBranchRepository";
import { InMemoryCorrespondenceRepository } from "./InMemoryCorrespondenceRepository";
import { InMemoryDepartmentRepository } from "./InMemoryDepartmentRepository";
import { InMemoryNotificationService } from "./InMemoryNotificationService";
import { InMemoryPostCaptureWorkflowService } from "./InMemoryPostCaptureWorkflowService";
import { InMemoryReferenceConfigRepository } from "./InMemoryReferenceConfigRepository";
import { InMemorySmtpSettingsService } from "./InMemorySmtpSettingsService";
import { InMemoryUserRepository } from "./InMemoryUserRepository";
import { InMemoryCorrespondenceAuditLogRepository } from "./InMemoryCorrespondenceAuditLogRepository";
import { buildPlatformIndicator } from "../../platformIndicator";

export const inMemoryPlatformIndicator = buildPlatformIndicator({
  target: "IN_MEMORY",
  label: "In-memory",
  initials: "IM",
  backgroundColor: "#2f8f58"
});

export function createInMemoryHostAdapter(): IHostAdapter {
  const notifications = new InMemoryNotificationService();
  const correspondenceAuditLog = new InMemoryCorrespondenceAuditLogRepository();
  const smtpSettings = new InMemorySmtpSettingsService();

  return {
    platform: inMemoryPlatformIndicator,
    correspondences: new InMemoryCorrespondenceRepository(demoCorrespondences),
    users: new InMemoryUserRepository(demoUsers),
    branches: new InMemoryBranchRepository(demoBranches),
    departments: new InMemoryDepartmentRepository(demoDepartments),
    referenceConfigs: new InMemoryReferenceConfigRepository(demoReferenceConfigs),
    smtpSettings,
    notifications,
    correspondenceAuditLog,
    postCaptureWorkflow: new InMemoryPostCaptureWorkflowService(notifications, correspondenceAuditLog),
    sequenceStore: new InMemorySequenceStore()
  };
}
