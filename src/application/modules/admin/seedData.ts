import type { Correspondence } from "../../../domain/correspondence";
import type { CorrespondenceActionDefinition } from "../../../domain/correspondenceAction";
import { ALL_ROLE_CODES, type AppUser, type Branch, type BranchDepartment, type Department } from "../../../domain/governance";
import type { ReferenceFormatConfig } from "../../../domain/reference";

export const demoBranches: Branch[] = [
  { id: "b-001", code: "HQ", name: "Headquarters", isActive: true },
  { id: "b-002", code: "BRN-02", name: "Branch 02", isActive: true }
];

export const demoDepartments: Department[] = [
  { id: "d-001", code: "OPS", name: "Operations", isActive: true },
  { id: "d-002", code: "FIN", name: "Finance", isActive: true }
];

export const demoBranchDepartments: BranchDepartment[] = [
  { id: "bd-001", branchId: "b-001", departmentId: "d-001", isActive: true },
  { id: "bd-002", branchId: "b-001", departmentId: "d-002", isActive: true },
  { id: "bd-003", branchId: "b-002", departmentId: "d-002", isActive: true }
];

export const demoUsers: AppUser[] = [
  {
    id: "u-001",
    userId: "reception@bank.local",
    employeeCode: "EMP-001",
    fullName: "Reception User",
    email: "reception@bank.local",
    branchId: "b-001",
    departmentId: "d-001",
    isActive: true,
    canLogin: true,
    canOwnActions: false,
    roles: ["RECEPTIONIST"]
  },
  {
    id: "u-002",
    userId: "owner@bank.local",
    employeeCode: "EMP-002",
    fullName: "Recipient Owner",
    email: "owner@bank.local",
    branchId: "b-001",
    departmentId: "d-001",
    isActive: true,
    canLogin: true,
    canOwnActions: true,
    roles: ["RECIPIENT"]
  },
  {
    id: "u-003",
    userId: "recipient@bank.local",
    employeeCode: "EMP-003",
    fullName: "Recipient User",
    email: "recipient@bank.local",
    branchId: "b-002",
    departmentId: "d-002",
    isActive: true,
    canLogin: true,
    canOwnActions: false,
    roles: ["RECIPIENT"]
  },
  {
    id: "u-004",
    userId: "superadmin@bank.local",
    employeeCode: "EMP-000",
    fullName: "Default Super Admin",
    email: "superadmin@bank.local",
    branchId: "b-001",
    departmentId: "d-001",
    isActive: true,
    canLogin: true,
    canOwnActions: true,
    roles: [...ALL_ROLE_CODES]
  },
  {
    id: "u-005",
    userId: "executive@bank.local",
    employeeCode: "EMP-005",
    fullName: "Executive User",
    email: "executive@bank.local",
    branchId: "b-001",
    departmentId: "d-002",
    isActive: true,
    canLogin: true,
    canOwnActions: false,
    roles: ["EXECUTIVE"]
  }
];

export const demoReferenceConfigs: ReferenceFormatConfig[] = [
  {
    id: "cfg-branch-dept",
    scope: "BRANCH_DEPARTMENT",
    branchId: "b-001",
    departmentId: "d-001",
    pattern: "{ORG}-{BRANCH}-{DEPT}-{YYYY}{MM}-{SEQ6}",
    resetPolicy: "MONTHLY",
    isActive: true
  },
  {
    id: "cfg-branch",
    scope: "BRANCH",
    branchId: "b-001",
    pattern: "{ORG}-{BRANCH}-{YYYY}{MM}-{SEQ5}",
    resetPolicy: "MONTHLY",
    isActive: true
  },
  {
    id: "cfg-global",
    scope: "GLOBAL",
    pattern: "{ORG}-{YYYY}{MM}-{SEQ4}",
    resetPolicy: "MONTHLY",
    isActive: true
  }
];

export const demoActionDefinitions: CorrespondenceActionDefinition[] = [
  {
    id: "act-001",
    code: "FOR_INFORMATION",
    label: "For Information",
    description: "Read-only action; no external workflow is triggered.",
    category: "INFO",
    requiresOwner: false,
    triggerMode: "NONE",
    workflowEnabled: false,
    workflowMethod: "POST",
    workflowTimeoutMs: 10000,
    authType: "NONE",
    retryMaxAttempts: 0,
    retryBackoffMs: 0,
    defaultSlaDays: 0,
    isActive: true,
    createdAt: new Date("2026-04-20T08:00:00.000Z"),
    updatedAt: new Date("2026-04-20T08:00:00.000Z")
  },
  {
    id: "act-002",
    code: "RESPOND_TO",
    label: "Respond To",
    description: "Owner-triggered action that calls an HTTP workflow endpoint.",
    category: "RESPONSE",
    requiresOwner: true,
    triggerMode: "OWNER_EXECUTE",
    workflowEnabled: true,
    workflowMethod: "POST",
    workflowEndpointUrl: "https://workflow.local/respond",
    workflowTimeoutMs: 15000,
    authType: "BEARER_TOKEN_REF",
    authSecretRef: "secrets/workflow/respond-token",
    payloadTemplate: "{\"correspondenceId\":\"{{correspondence.id}}\",\"actionCode\":\"{{action.code}}\"}",
    retryMaxAttempts: 2,
    retryBackoffMs: 2000,
    defaultSlaDays: 3,
    isActive: true,
    createdAt: new Date("2026-04-20T08:00:00.000Z"),
    updatedAt: new Date("2026-04-20T08:00:00.000Z")
  }
];

const seededByReceptionist = demoUsers.find((user) => user.id === "u-001");
if (!seededByReceptionist) {
  throw new Error("Seed user u-001 is required for correspondence audit fields.");
}

export const demoCorrespondences: Correspondence[] = [
  {
    id: "c-001",
    reference: "BANK-HQ-OPS-202604-000001",
    subject: "Regulatory request for Q1 compliance returns",
    direction: "INCOMING",
    fromTo: "Central Bank Regulatory Authority",
    organisation: "Central Bank",
    correspondenceDate: new Date("2026-04-19T00:00:00.000Z"),
    branchId: "b-001",
    departmentId: "d-001",
    registeredById: "u-001",
    recipientId: "u-003",
    actionOwnerId: "u-002",
    status: "IN_PROGRESS",
    receivedDate: new Date("2026-04-20T00:00:00.000Z"),
    dueDate: new Date("2026-04-24T00:00:00.000Z"),
    createdAt: new Date("2026-04-20T08:00:00.000Z"),
    updatedAt: new Date("2026-04-20T08:00:00.000Z"),
    createBy: seededByReceptionist,
    updateBy: seededByReceptionist
  },
  {
    id: "c-002",
    reference: "BANK-HQ-FIN-202604-000014",
    subject: "Treasury confirmation memo",
    direction: "OUTGOING",
    fromTo: "Ministry of Finance",
    organisation: "Ministry of Finance",
    branchId: "b-001",
    departmentId: "d-002",
    registeredById: "u-001",
    recipientId: "u-005",
    actionOwnerId: "u-002",
    status: "IN_PROGRESS",
    receivedDate: new Date("2026-04-20T00:00:00.000Z"),
    dueDate: new Date("2026-04-23T00:00:00.000Z"),
    createdAt: new Date("2026-04-20T09:00:00.000Z"),
    updatedAt: new Date("2026-04-20T09:00:00.000Z"),
    createBy: seededByReceptionist,
    updateBy: seededByReceptionist
  },
  {
    id: "c-003",
    reference: "BANK-BRN-02-FIN-202604-000102",
    subject: "Branch audit exception follow-up",
    direction: "INCOMING",
    fromTo: "Internal Audit Division",
    correspondenceDate: new Date("2026-04-17T00:00:00.000Z"),
    branchId: "b-002",
    departmentId: "d-002",
    registeredById: "u-001",
    recipientId: "u-003",
    actionOwnerId: "u-002",
    status: "NEW",
    receivedDate: new Date("2026-04-18T00:00:00.000Z"),
    dueDate: new Date("2026-04-25T00:00:00.000Z"),
    createdAt: new Date("2026-04-18T10:00:00.000Z"),
    updatedAt: new Date("2026-04-18T10:00:00.000Z"),
    createBy: seededByReceptionist,
    updateBy: seededByReceptionist
  }
];
