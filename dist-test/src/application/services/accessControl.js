export function hasRole(user, role) {
    return user.roles.includes(role);
}
export function assertRole(user, role) {
    if (!hasRole(user, role)) {
        throw new Error(`Access denied. Role ${role} is required.`);
    }
}
export function assertAssignableUser(user) {
    if (!user.isActive) {
        throw new Error("User is inactive and cannot be assigned.");
    }
    if (!user.canOwnActions) {
        throw new Error("User is not eligible to own actions.");
    }
}
