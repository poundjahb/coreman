import type { AppUser, RoleCode } from "../../domain/governance";

export function hasRole(user: AppUser, role: RoleCode): boolean {
  return user.roles.includes(role);
}

export function assertRole(user: AppUser, role: RoleCode): void {
  if (!hasRole(user, role)) {
    throw new Error(`Access denied. Role ${role} is required.`);
  }
}

export function assertAssignableUser(user: AppUser): void {
  if (!user.isActive) {
    throw new Error("User is inactive and cannot be assigned.");
  }

  if (!user.canOwnActions) {
    throw new Error("User is not eligible to own actions.");
  }
}
