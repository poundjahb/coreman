export type WorkflowPluginPlatformTarget = "SERVER" | "POWERAPP";

export type WorkflowBindingType = "EVENT" | "ACTION";

export type WorkflowExecutionStatus = "SUCCESS" | "FAILED" | "SKIPPED";

export interface WorkflowPluginRecord {
  pluginKey: string;
  name: string;
  description: string;
  version: string;
  apiVersion: string;
  platformTarget: WorkflowPluginPlatformTarget;
  supportedTriggers: string[];
  entryFile: string;
  sourcePath: string;
  checksum: string;
  isEnabled: boolean;
  isValid: boolean;
  validationErrors: string[];
  discoveredAt: Date;
  updatedAt: Date;
}

export interface WorkflowBindingRecord {
  id: string;
  bindingType: WorkflowBindingType;
  triggerCode?: string;
  actionDefinitionId?: string;
  pluginKey: string;
  priority: number;
  isActive: boolean;
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
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

export interface WorkflowExecutionResult {
  pluginKey?: string;
  status: WorkflowExecutionStatus;
  message?: string;
  output?: Record<string, unknown>;
}