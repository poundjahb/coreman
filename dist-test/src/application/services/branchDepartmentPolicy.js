import { demoBranchDepartments } from "../modules/admin/seedData";
function getAllowedDepartmentIds(branchId) {
    return new Set(demoBranchDepartments
        .filter((link) => link.isActive && link.branchId === branchId)
        .map((link) => link.departmentId));
}
export function filterDepartmentsForBranch(branchId, departments) {
    if (!branchId) {
        return departments;
    }
    const allowedIds = getAllowedDepartmentIds(branchId);
    if (allowedIds.size === 0) {
        return departments;
    }
    return departments.filter((department) => allowedIds.has(department.id));
}
export function isDepartmentAllowedForBranch(branchId, departmentId) {
    if (!departmentId) {
        return true;
    }
    const allowedIds = getAllowedDepartmentIds(branchId);
    if (allowedIds.size === 0) {
        return true;
    }
    return allowedIds.has(departmentId);
}
