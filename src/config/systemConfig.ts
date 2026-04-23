import type { SystemConfig } from "../domain/governance";

export type PlatformTarget = "IN_MEMORY" | "DATAVERSE" | "SQLITE" | "SERVER";
export type WorkflowMode = "BASIC" | "EXTENDED";

export interface PlatformConfig {
  target: PlatformTarget;
}

export interface WorkflowConfig {
  mode: WorkflowMode;
}

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  fromAddress: string;
  connectionTimeoutMs: number;
}

export const systemConfig: SystemConfig = {
  authMode: "APP",
  orgCode: "BANK"
};

export const platformConfig: PlatformConfig = {
  target: "SERVER"
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

function readEnvValue(key: string): string | undefined {
  if (typeof process !== "undefined") {
    const processValue = process.env?.[key];
    if (typeof processValue === "string" && processValue.length > 0) {
      return processValue;
    }
  }

  if (typeof import.meta !== "undefined") {
    const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
    const viteValue = env?.[`VITE_${key}`];
    if (typeof viteValue === "string" && viteValue.length > 0) {
      return viteValue;
    }
  }

  return undefined;
}

function parsePort(rawValue: string | undefined, fallback: number): number {
  if (!rawValue) {
    return fallback;
  }

  const parsed = Number.parseInt(rawValue, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function parseBoolean(rawValue: string | undefined, fallback: boolean): boolean {
  if (!rawValue) {
    return fallback;
  }

  const normalized = rawValue.trim().toLowerCase();
  if (normalized === "true" || normalized === "1" || normalized === "yes") {
    return true;
  }

  if (normalized === "false" || normalized === "0" || normalized === "no") {
    return false;
  }

  return fallback;
}

export function getRuntimeSmtpConfig(): SmtpConfig {
  return {
    host: readEnvValue("SMTP_HOST") ?? "127.0.0.1",
    port: parsePort(readEnvValue("SMTP_PORT"), 1025),
    secure: parseBoolean(readEnvValue("SMTP_SECURE"), false),
    user: readEnvValue("SMTP_USER"),
    pass: readEnvValue("SMTP_PASS"),
    fromAddress: readEnvValue("SMTP_FROM") ?? "noreply@bank.local",
    connectionTimeoutMs: parsePort(readEnvValue("SMTP_CONNECTION_TIMEOUT_MS"), 3000)
  };
}
