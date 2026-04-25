import type {
  WorkflowBindingRecord,
  WorkflowCatalogSnapshot,
  WorkflowPluginRecord,
  WorkflowPluginRefreshResult
} from "../../domain/workflowPlugin";

export interface SaveWorkflowBindingCommand {
  id?: string;
  bindingType: "EVENT" | "ACTION";
  triggerCode?: string;
  actionDefinitionId?: string;
  pluginKey: string;
  priority?: number;
  isActive?: boolean;
  actorId?: string;
}

export interface IWorkflowPluginService {
  getCatalog(): Promise<WorkflowCatalogSnapshot>;
  listPlugins(): Promise<WorkflowPluginRecord[]>;
  refresh(): Promise<WorkflowPluginRefreshResult>;
  setPluginEnabled(pluginKey: string, isEnabled: boolean): Promise<void>;
  listBindings(): Promise<WorkflowBindingRecord[]>;
  saveBinding(command: SaveWorkflowBindingCommand): Promise<WorkflowBindingRecord>;
  deleteBinding(id: string): Promise<void>;
}