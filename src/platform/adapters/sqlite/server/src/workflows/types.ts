import type Database from "better-sqlite3";

export type WorkflowPluginPlatformTarget = "SERVER" | "POWERAPP";
export type WorkflowBindingType = "EVENT" | "ACTION";
export type WorkflowExecutionStatus = "SUCCESS" | "FAILED" | "SKIPPED";

export interface WorkflowPluginManifest {
  pluginKey: string;
  name: string;
  description: string;
  version: string;
  apiVersion: string;
  platformTarget: WorkflowPluginPlatformTarget;
  supportedTriggers: string[];
  entryFile: string;
  enabledByDefault: boolean;
}

export interface WorkflowPluginRecord extends WorkflowPluginManifest {
  sourcePath: string;
  checksum: string;
  isEnabled: boolean;
  isValid: boolean;
  validationErrors: string[];
  discoveredAt: string;
  updatedAt: string;
}

export interface WorkflowBindingRecord {
  id: string;
  bindingType: WorkflowBindingType;
  triggerCode: string | null;
  actionDefinitionId: string | null;
  pluginKey: string;
  priority: number;
  isActive: boolean;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowCatalogSummary {
  discoveredPlugins: number;
  activeBindings: number;
  invalidPlugins: number;
}

export interface WorkflowCatalogSnapshot {
  plugins: WorkflowPluginRecord[];
  bindings: WorkflowBindingRecord[];
  summary: WorkflowCatalogSummary;
}

export interface WorkflowPluginRefreshResult {
  discoveredCount: number;
  invalidCount: number;
  updatedAt: string;
}

export interface WorkflowExecutionRequest {
  eventCode?: string;
  actionDefinitionId?: string;
  correspondenceId: string;
  actorId: string;
  mode?: string;
  context?: Record<string, unknown>;
}

export interface WorkflowExecutionResult {
  pluginKey?: string;
  status: WorkflowExecutionStatus;
  message?: string;
  output?: Record<string, unknown>;
}

export interface WorkflowExecutionContext {
  trigger: {
    type: WorkflowBindingType;
    code: string;
    eventCode?: string;
    actionDefinitionId?: string;
  };
  correspondenceId: string;
  actorId: string;
  mode?: string;
  context: Record<string, unknown>;
  resources: {
    audit: {
      append: (entry: { eventType: string; status?: string; payload?: Record<string, unknown>; errorMessage?: string }) => void;
    };
    notifications: {
      send: (payload: { recipientId: string; subject: string; body: string; correspondenceId?: string }) => Promise<void>;
    };
    correspondences: {
      find: (id: string) => Record<string, unknown> | null;
      updateSummary: (id: string, summary: string) => void;
    };
    users: {
      find: (id: string) => Record<string, unknown> | null;
    };
    actionDefinitions: {
      find: (id: string) => Record<string, unknown> | null;
      listActive: () => Array<Record<string, unknown>>;
    };
    config: {
      get: (key: string) => string | undefined;
    };
  };
}

export interface LoadedWorkflowModule {
  metadata: WorkflowPluginManifest;
  execute: (context: WorkflowExecutionContext) => Promise<Record<string, unknown> | void>;
}

export interface WorkflowConfig {
  pluginRoot: string;
  platformTarget: WorkflowPluginPlatformTarget;
  pluginTimeoutMs: number;
  strictMode: boolean;
  allowedApiVersion: string;
}

export function readWorkflowConfig(): WorkflowConfig {
  return {
    pluginRoot: process.env.COREMAN_WORKFLOW_PLUGIN_ROOT ?? "./plugins",
    platformTarget: process.env.COREMAN_WORKFLOW_PLATFORM_TARGET === "POWERAPP" ? "POWERAPP" : "SERVER",
    pluginTimeoutMs: Number.parseInt(process.env.COREMAN_WORKFLOW_PLUGIN_TIMEOUT_MS ?? "15000", 10),
    strictMode: process.env.COREMAN_WORKFLOW_STRICT_MODE === "true",
    allowedApiVersion: process.env.COREMAN_WORKFLOW_ALLOWED_API_VERSION ?? "1.x"
  };
}

export function normalizeWorkflowPluginRow(row: Record<string, unknown>): WorkflowPluginRecord {
  const validationErrorsJson = typeof row.validationErrorsJson === "string" ? row.validationErrorsJson : "[]";
  return {
    pluginKey: String(row.pluginKey),
    name: String(row.name),
    description: String(row.description),
    version: String(row.version),
    apiVersion: String(row.apiVersion),
    platformTarget: row.platformTarget === "POWERAPP" ? "POWERAPP" : "SERVER",
    supportedTriggers: safeJsonArray(row.supportedTriggersJson),
    entryFile: String(row.entryFile),
    enabledByDefault: Boolean(row.isEnabled),
    sourcePath: String(row.sourcePath),
    checksum: String(row.checksum),
    isEnabled: Boolean(row.isEnabled),
    isValid: Boolean(row.isValid),
    validationErrors: safeJsonArray(validationErrorsJson),
    discoveredAt: String(row.discoveredAt),
    updatedAt: String(row.updatedAt)
  };
}

export function normalizeWorkflowBindingRow(row: Record<string, unknown>): WorkflowBindingRecord {
  return {
    id: String(row.id),
    bindingType: row.bindingType === "ACTION" ? "ACTION" : "EVENT",
    triggerCode: row.triggerCode === null || row.triggerCode === undefined ? null : String(row.triggerCode),
    actionDefinitionId: row.actionDefinitionId === null || row.actionDefinitionId === undefined ? null : String(row.actionDefinitionId),
    pluginKey: String(row.pluginKey),
    priority: Number(row.priority ?? 100),
    isActive: Boolean(row.isActive),
    createdBy: String(row.createdBy),
    updatedBy: String(row.updatedBy),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt)
  };
}

export function buildWorkflowCatalog(
  plugins: WorkflowPluginRecord[],
  bindings: WorkflowBindingRecord[]
): WorkflowCatalogSnapshot {
  return {
    plugins,
    bindings,
    summary: {
      discoveredPlugins: plugins.length,
      activeBindings: bindings.filter((binding) => binding.isActive).length,
      invalidPlugins: plugins.filter((plugin) => !plugin.isValid).length
    }
  };
}

export function resolveWorkflowBinding(
  db: Database.Database,
  input: { actionDefinitionId?: string; eventCode?: string }
): WorkflowBindingRecord | null {
  if (input.actionDefinitionId) {
    const actionRow = db.prepare(
      `SELECT *
       FROM workflow_bindings
       WHERE bindingType = 'ACTION' AND actionDefinitionId = ? AND isActive = 1
       ORDER BY priority ASC, updatedAt DESC
       LIMIT 1`
    ).get(input.actionDefinitionId) as Record<string, unknown> | undefined;

    if (actionRow) {
      return normalizeWorkflowBindingRow(actionRow);
    }
  }

  if (input.eventCode) {
    const eventRow = db.prepare(
      `SELECT *
       FROM workflow_bindings
       WHERE bindingType = 'EVENT' AND triggerCode = ? AND isActive = 1
       ORDER BY priority ASC, updatedAt DESC
       LIMIT 1`
    ).get(input.eventCode) as Record<string, unknown> | undefined;

    if (eventRow) {
      return normalizeWorkflowBindingRow(eventRow);
    }
  }

  return null;
}

function safeJsonArray(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((item): item is string => typeof item === "string");
  }

  if (typeof raw !== "string") {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}