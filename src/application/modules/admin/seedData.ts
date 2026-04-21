import type { Correspondence } from "../../../domain/correspondence";
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
    employeeCode: "EMP-002",
    fullName: "Action Owner",
    email: "owner@bank.local",
    branchId: "b-001",
    departmentId: "d-001",
    isActive: true,
    canLogin: true,
    canOwnActions: true,
    roles: ["ACTION_OWNER"]
  },
  {
    id: "u-003",
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
    employeeCode: "EMP-005",
    fullName: "Executive Viewer",
    email: "executive@bank.local",
    branchId: "b-001",
    departmentId: "d-002",
    isActive: true,
    canLogin: true,
    canOwnActions: false,
    roles: ["DASHBOARD_VIEWER", "COPIED_VIEWER"]
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

export const demoCorrespondences: Correspondence[] = [
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
