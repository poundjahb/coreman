import type { Department } from "../../domain/governance";

export function filterDepartmentsForBranch(
  _branchId: string | null | undefined,
  departments: Department[]
): Department[] {
  return departments.filter((department) => department.isActive);
}

export function isDepartmentAllowedForBranch(
  _branchId: string,
  departmentId: string | undefined,
  departments?: Department[]
): boolean {
  if (!departmentId) {
    return true;
  }

  if (!departments || departments.length === 0) {
    return true;
  }

  return departments.some((department) => department.id === departmentId && department.isActive);
}
