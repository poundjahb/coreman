import type { AppUser } from "../../domain/governance";
import type { ReferenceFormatConfig } from "../../domain/reference";

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
    employeeCode: "EMP-004",
    fullName: "System Administrator",
    email: "admin@bank.local",
    branchId: "b-001",
    departmentId: "d-001",
    isActive: true,
    canLogin: true,
    canOwnActions: true,
    roles: ["ADMIN", "DASHBOARD_VIEWER"]
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
