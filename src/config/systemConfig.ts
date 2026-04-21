import type { SystemConfig } from "../domain/governance";

export type PlatformTarget = "IN_MEMORY" | "DATAVERSE" | "SQLITE";

export interface PlatformConfig {
  target: PlatformTarget;
}

export const systemConfig: SystemConfig = {
  authMode: "APP",
  orgCode: "BANK"
};

export const platformConfig: PlatformConfig = {
  target: "IN_MEMORY"
};

export function setAuthMode(config: SystemConfig, nextMode: SystemConfig["authMode"]): SystemConfig {
  return {
    ...config,
    authMode: nextMode
  };
}

export function setPlatformTarget(config: PlatformConfig, target: PlatformTarget): PlatformConfig {
  return { ...config, target };
}
