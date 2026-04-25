import type {
  WorkflowBindingRecord,
  WorkflowCatalogSnapshot,
  WorkflowPluginRecord,
  WorkflowPluginRefreshResult
} from "../../../domain/workflowPlugin";
import type {
  IWorkflowPluginService,
  SaveWorkflowBindingCommand
} from "../../contracts/IWorkflowPluginService";

export class InMemoryWorkflowPluginService implements IWorkflowPluginService {
  async getCatalog(): Promise<WorkflowCatalogSnapshot> {
    return {
      plugins: [],
      bindings: [],
      summary: {
        discoveredPlugins: 0,
        activeBindings: 0,
        invalidPlugins: 0
      }
    };
  }

  async listPlugins(): Promise<WorkflowPluginRecord[]> {
    return [];
  }

  async refresh(): Promise<WorkflowPluginRefreshResult> {
    return {
      discoveredCount: 0,
      invalidCount: 0,
      updatedAt: new Date().toISOString()
    };
  }

  async setPluginEnabled(_pluginKey: string, _isEnabled: boolean): Promise<void> {
    return undefined;
  }

  async listBindings(): Promise<WorkflowBindingRecord[]> {
    return [];
  }

  async saveBinding(_command: SaveWorkflowBindingCommand): Promise<WorkflowBindingRecord> {
    throw new Error("Workflow plugin bindings are not available for the in-memory host adapter.");
  }

  async deleteBinding(_id: string): Promise<void> {
    throw new Error("Workflow plugin bindings are not available for the in-memory host adapter.");
  }
}