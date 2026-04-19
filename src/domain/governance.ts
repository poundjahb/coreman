export type AuthMode = "APP" | "ENTRA";

export type RoleCode =
  | "ADMIN"
  | "RECEPTIONIST"
  | "RECIPIENT"
  | "ACTION_OWNER"
  | "COPIED_VIEWER"
  | "DASHBOARD_VIEWER";

export interface Branch {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
}

export interface Department {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
}

export interface BranchDepartment {
  id: string;
  branchId: string;
  departmentId: string;
  isActive: boolean;
}

export interface AppUser {
  id: string;
  employeeCode: string;
  fullName: string;
  email: string;
  branchId: string;
  departmentId: string;
  isActive: boolean;
  canLogin: boolean;
  canOwnActions: boolean;
  roles: RoleCode[];
}

export interface SystemConfig {
  authMode: AuthMode;
  orgCode: string;
}
