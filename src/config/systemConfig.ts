import type { SystemConfig } from "../domain/governance";

export const systemConfig: SystemConfig = {
  authMode: "APP",
  orgCode: "BANK"
};

export function setAuthMode(config: SystemConfig, nextMode: SystemConfig["authMode"]): SystemConfig {
  return {
    ...config,
    authMode: nextMode
  };
}
