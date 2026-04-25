import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import type { LoadedWorkflowModule, WorkflowPluginRecord } from "./types.js";

const workflowModuleCache = new Map<string, LoadedWorkflowModule>();

export async function loadWorkflowModule(record: WorkflowPluginRecord): Promise<LoadedWorkflowModule> {
  const cacheKey = `${record.pluginKey}:${record.checksum}`;
  const cached = workflowModuleCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const entryPath = path.join(record.sourcePath, record.entryFile);
  if (!fs.existsSync(entryPath)) {
    throw new Error(`Plugin entry file not found: ${entryPath}`);
  }

  const moduleUrl = `${pathToFileURL(entryPath).href}?checksum=${encodeURIComponent(record.checksum)}`;
  const imported = await import(moduleUrl) as Partial<LoadedWorkflowModule>;

  if (!imported.metadata || typeof imported.execute !== "function") {
    throw new Error(`Plugin ${record.pluginKey} must export metadata and execute(context).`);
  }

  const loaded: LoadedWorkflowModule = {
    metadata: imported.metadata,
    execute: imported.execute
  };

  workflowModuleCache.set(cacheKey, loaded);
  return loaded;
}

export function clearWorkflowModuleCache(): void {
  workflowModuleCache.clear();
}