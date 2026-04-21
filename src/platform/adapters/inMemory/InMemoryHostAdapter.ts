import type { Branch, Department } from "../../../domain/governance";
import type { Correspondence } from "../../../domain/correspondence";
import { InMemorySequenceStore } from "../../../application/services/referenceEngine";
import { demoUsers, demoReferenceConfigs } from "../../../application/modules/admin/seedData";
import type { IHostAdapter } from "../../IHostAdapter";
import { InMemoryBranchRepository } from "./InMemoryBranchRepository";
import { InMemoryCorrespondenceRepository } from "./InMemoryCorrespondenceRepository";
import { InMemoryDepartmentRepository } from "./InMemoryDepartmentRepository";
import { InMemoryNotificationService } from "./InMemoryNotificationService";
import { InMemoryReferenceConfigRepository } from "./InMemoryReferenceConfigRepository";
import { InMemoryUserRepository } from "./InMemoryUserRepository";
import { buildPlatformIndicator } from "../../platformIndicator";

export const inMemoryPlatformIndicator = buildPlatformIndicator({
  target: "IN_MEMORY",
  label: "In-memory",
  initials: "IM",
  backgroundColor: "#2f8f58"
});

const seedBranches: Branch[] = [
  { id: "b-001", code: "HQ", name: "Headquarters", isActive: true },
  { id: "b-002", code: "BRN-02", name: "Branch 02", isActive: true }
];

const seedDepartments: Department[] = [
  { id: "d-001", code: "OPS", name: "Operations", isActive: true },
  { id: "d-002", code: "FIN", name: "Finance", isActive: true }
];

const seedCorrespondences: Correspondence[] = [
  {
    id: "c-001",
    reference: "BANK-HQ-OPS-202604-000001",
    subject: "Regulatory request for Q1 compliance returns",
    direction: "INCOMING",
    branchId: "b-001",
    departmentId: "d-001",
    registeredById: "u-001",
    recipientId: "u-003",
    actionOwnerId: "u-002",
    status: "IN_PROGRESS",
    receivedDate: "2026-04-20",
    dueDate: "2026-04-24",
    createdAt: "2026-04-20T08:00:00Z",
    updatedAt: "2026-04-20T08:00:00Z"
  },
  {
    id: "c-002",
    reference: "BANK-HQ-FIN-202604-000014",
    subject: "Treasury confirmation memo",
    direction: "OUTGOING",
    branchId: "b-001",
    departmentId: "d-002",
    registeredById: "u-001",
    recipientId: "u-005",
    actionOwnerId: "u-002",
    status: "AWAITING_REVIEW",
    receivedDate: "2026-04-20",
    dueDate: "2026-04-23",
    createdAt: "2026-04-20T09:00:00Z",
    updatedAt: "2026-04-20T09:00:00Z"
  },
  {
    id: "c-003",
    reference: "BANK-BRN-02-FIN-202604-000102",
    subject: "Branch audit exception follow-up",
    direction: "INCOMING",
    branchId: "b-002",
    departmentId: "d-002",
    registeredById: "u-001",
    recipientId: "u-003",
    actionOwnerId: "u-002",
    status: "NEW",
    receivedDate: "2026-04-18",
    dueDate: "2026-04-25",
    createdAt: "2026-04-18T10:00:00Z",
    updatedAt: "2026-04-18T10:00:00Z"
  }
];

export function createInMemoryHostAdapter(): IHostAdapter {
  return {
    platform: inMemoryPlatformIndicator,
    correspondences: new InMemoryCorrespondenceRepository(seedCorrespondences),
    users: new InMemoryUserRepository(demoUsers),
    branches: new InMemoryBranchRepository(seedBranches),
    departments: new InMemoryDepartmentRepository(seedDepartments),
    referenceConfigs: new InMemoryReferenceConfigRepository(demoReferenceConfigs),
    notifications: new InMemoryNotificationService(),
    sequenceStore: new InMemorySequenceStore()
  };
}
