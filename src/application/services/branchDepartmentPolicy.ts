import type { Department } from "../../domain/governance";
import { demoBranchDepartments } from "../modules/admin/seedData";

function getAllowedDepartmentIds(branchId: string): Set<string> {
  return new Set(
    demoBranchDepartments
      .filter((link) => link.isActive && link.branchId === branchId)
      .map((link) => link.departmentId)
  );
}

export function filterDepartmentsForBranch(
  branchId: string | null | undefined,
  departments: Department[]
): Department[] {
  if (!branchId) {
    return departments;
  }

  const allowedIds = getAllowedDepartmentIds(branchId);
  if (allowedIds.size === 0) {
    return departments;
  }

  return departments.filter((department) => allowedIds.has(department.id));
}

export function isDepartmentAllowedForBranch(
  branchId: string,
  departmentId: string | undefined
): boolean {
  if (!departmentId) {
    return true;
  }

  const allowedIds = getAllowedDepartmentIds(branchId);
  if (allowedIds.size === 0) {
    return true;
  }

  return allowedIds.has(departmentId);
}
