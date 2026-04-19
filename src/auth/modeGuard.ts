import type { AuthMode, AppUser } from "../domain/governance";

export interface AuthResult {
  success: boolean;
  reason?: string;
}

export function validateAuthMode(activeMode: AuthMode, requestedMode: AuthMode): AuthResult {
  if (activeMode !== requestedMode) {
    return {
      success: false,
      reason: `Authentication mode mismatch: active mode is ${activeMode}.`
    };
  }

  return { success: true };
}

export function validateExplicitUser(user: AppUser | null): AuthResult {
  if (!user) {
    return {
      success: false,
      reason: "User is not explicitly registered in the application."
    };
  }

  if (!user.isActive || !user.canLogin) {
    return {
      success: false,
      reason: "User is inactive or not allowed to login."
    };
  }

  return { success: true };
}
