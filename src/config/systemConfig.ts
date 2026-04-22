import type { SystemConfig } from "../domain/governance";

export type PlatformTarget = "IN_MEMORY" | "DATAVERSE" | "SQLITE";
export type WorkflowMode = "BASIC" | "EXTENDED";

export interface PlatformConfig {
  target: PlatformTarget;
}

export interface WorkflowConfig {
  mode: WorkflowMode;
}

export const systemConfig: SystemConfig = {
  authMode: "APP",
  orgCode: "BANK"
};

export const platformConfig: PlatformConfig = {
  target: "SQLITE"
};

export const workflowConfig: WorkflowConfig = {
  mode: "BASIC"
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

export function setWorkflowMode(config: WorkflowConfig, mode: WorkflowMode): WorkflowConfig {
  return { ...config, mode };
}

export function getRuntimeWorkflowMode(): WorkflowMode {
  if (typeof import.meta !== "undefined") {
    const mode = (import.meta as ImportMeta & { env?: { VITE_WORKFLOW_MODE?: string } }).env?.VITE_WORKFLOW_MODE;
    if (mode === "BASIC" || mode === "EXTENDED") {
      return mode;
    }
  }

  return workflowConfig.mode;
}
