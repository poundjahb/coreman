import type { Request, Response, Router } from "express";
import type Database from "better-sqlite3";
import { randomUUID } from "crypto";
import { refreshWorkflowPlugins, listWorkflowPlugins } from "../workflows/discovery.js";
import { buildWorkflowCatalog, normalizeWorkflowBindingRow } from "../workflows/types.js";
import { clearWorkflowRuntime } from "../workflows/engine.js";

type SaveWorkflowBindingPayload = {
  bindingType?: "EVENT" | "ACTION";
  triggerCode?: string;
  actionDefinitionId?: string;
  pluginKey?: string;
  priority?: number;
  isActive?: boolean;
};

export function registerWorkflowPluginRoutes(router: Router, db: Database.Database): void {
  router.get("/api/workflow-catalog", (_req: Request, res: Response) => {
    try {
      const plugins = ensureWorkflowPluginsLoaded(db);
      const bindings = listWorkflowBindings(db);
      res.json(buildWorkflowCatalog(plugins, bindings));
    } catch (error) {
      console.error("Error fetching workflow catalog:", error);
      res.status(500).json({ error: "Failed to fetch workflow catalog" });
    }
  });

  router.get("/api/workflow-plugins", (_req: Request, res: Response) => {
    try {
      res.json(ensureWorkflowPluginsLoaded(db));
    } catch (error) {
      console.error("Error fetching workflow plugins:", error);
      res.status(500).json({ error: "Failed to fetch workflow plugins" });
    }
  });

  router.post("/api/workflow-plugins/refresh", (_req: Request, res: Response) => {
    try {
      clearWorkflowRuntime();
      const result = refreshWorkflowPlugins(db);
      res.json(result);
    } catch (error) {
      console.error("Error refreshing workflow plugins:", error);
      res.status(500).json({ error: "Failed to refresh workflow plugins" });
    }
  });

  router.patch("/api/workflow-plugins/:pluginKey/enabled", (req: Request, res: Response) => {
    try {
      const { pluginKey } = req.params;
      const { isEnabled } = req.body as { isEnabled?: boolean };
      if (typeof isEnabled !== "boolean") {
        res.status(400).json({ error: "isEnabled must be a boolean." });
        return;
      }

      const result = db.prepare("UPDATE workflow_plugins SET isEnabled = ?, updatedAt = ? WHERE pluginKey = ?")
        .run(isEnabled ? 1 : 0, new Date().toISOString(), pluginKey);

      if (result.changes === 0) {
        res.status(404).json({ error: "Workflow plugin not found" });
        return;
      }

      clearWorkflowRuntime();
      res.status(204).send();
    } catch (error) {
      console.error("Error updating workflow plugin state:", error);
      res.status(500).json({ error: "Failed to update workflow plugin state" });
    }
  });

  router.get("/api/workflow-bindings", (_req: Request, res: Response) => {
    try {
      res.json(listWorkflowBindings(db));
    } catch (error) {
      console.error("Error fetching workflow bindings:", error);
      res.status(500).json({ error: "Failed to fetch workflow bindings" });
    }
  });

  router.post("/api/workflow-bindings", (req: Request, res: Response) => {
    try {
      const actorId = req.session.userId ?? "SYSTEM";
      const saved = saveWorkflowBinding(db, actorId, req.body as SaveWorkflowBindingPayload);
      res.status(201).json(saved);
    } catch (error) {
      console.error("Error creating workflow binding:", error);
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to create workflow binding" });
    }
  });

  router.patch("/api/workflow-bindings/:id", (req: Request, res: Response) => {
    try {
      const actorId = req.session.userId ?? "SYSTEM";
      const existing = db.prepare("SELECT * FROM workflow_bindings WHERE id = ?").get(req.params.id) as Record<string, unknown> | undefined;
      if (!existing) {
        res.status(404).json({ error: "Workflow binding not found" });
        return;
      }

      const merged = {
        ...normalizeWorkflowBindingRow(existing),
        ...(req.body as SaveWorkflowBindingPayload),
        triggerCode: (req.body as SaveWorkflowBindingPayload).triggerCode
          ?? normalizeWorkflowBindingRow(existing).triggerCode
          ?? undefined,
        actionDefinitionId: (req.body as SaveWorkflowBindingPayload).actionDefinitionId
          ?? normalizeWorkflowBindingRow(existing).actionDefinitionId
          ?? undefined,
        id: req.params.id
      };
      const saved = saveWorkflowBinding(db, actorId, merged, req.params.id);
      res.json(saved);
    } catch (error) {
      console.error("Error updating workflow binding:", error);
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to update workflow binding" });
    }
  });

  router.delete("/api/workflow-bindings/:id", (req: Request, res: Response) => {
    try {
      const result = db.prepare("DELETE FROM workflow_bindings WHERE id = ?").run(req.params.id);
      if (result.changes === 0) {
        res.status(404).json({ error: "Workflow binding not found" });
        return;
      }

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting workflow binding:", error);
      res.status(500).json({ error: "Failed to delete workflow binding" });
    }
  });
}

function listWorkflowBindings(db: Database.Database) {
  const rows = db.prepare(
    `SELECT *
     FROM workflow_bindings
     ORDER BY bindingType ASC, priority ASC, updatedAt DESC`
  ).all() as Array<Record<string, unknown>>;

  return rows.map(normalizeWorkflowBindingRow);
}

function saveWorkflowBinding(
  db: Database.Database,
  actorId: string,
  payload: SaveWorkflowBindingPayload & { id?: string },
  existingId?: string
) {
  const bindingType = payload.bindingType === "ACTION" ? "ACTION" : payload.bindingType === "EVENT" ? "EVENT" : null;
  if (!bindingType) {
    throw new Error("bindingType must be EVENT or ACTION.");
  }
  if (!payload.pluginKey) {
    throw new Error("pluginKey is required.");
  }

  const plugin = db.prepare("SELECT pluginKey FROM workflow_plugins WHERE pluginKey = ?").get(payload.pluginKey) as
    | { pluginKey: string }
    | undefined;
  if (!plugin) {
    throw new Error("pluginKey must reference a discovered workflow plugin.");
  }

  if (bindingType === "EVENT" && !payload.triggerCode?.trim()) {
    throw new Error("triggerCode is required for EVENT bindings.");
  }
  if (bindingType === "ACTION" && !payload.actionDefinitionId?.trim()) {
    throw new Error("actionDefinitionId is required for ACTION bindings.");
  }

  const id = existingId ?? payload.id ?? randomUUID();
  const now = new Date().toISOString();
  const existing = existingId
    ? db.prepare("SELECT createdAt, createdBy FROM workflow_bindings WHERE id = ?").get(existingId) as
        | { createdAt: string; createdBy: string }
        | undefined
    : undefined;

  db.prepare(
    `INSERT INTO workflow_bindings (
      id, bindingType, triggerCode, actionDefinitionId, pluginKey, priority, isActive,
      createdBy, updatedBy, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      bindingType = excluded.bindingType,
      triggerCode = excluded.triggerCode,
      actionDefinitionId = excluded.actionDefinitionId,
      pluginKey = excluded.pluginKey,
      priority = excluded.priority,
      isActive = excluded.isActive,
      updatedBy = excluded.updatedBy,
      updatedAt = excluded.updatedAt`
  ).run(
    id,
    bindingType,
    bindingType === "EVENT" ? payload.triggerCode?.trim() ?? null : null,
    bindingType === "ACTION" ? payload.actionDefinitionId?.trim() ?? null : null,
    payload.pluginKey,
    Number(payload.priority ?? 100),
    payload.isActive === false ? 0 : 1,
    existing?.createdBy ?? actorId,
    actorId,
    existing?.createdAt ?? now,
    now
  );

  const row = db.prepare("SELECT * FROM workflow_bindings WHERE id = ?").get(id) as Record<string, unknown>;
  return normalizeWorkflowBindingRow(row);
}

function ensureWorkflowPluginsLoaded(db: Database.Database) {
  const plugins = listWorkflowPlugins(db);
  if (plugins.length > 0) {
    return plugins;
  }

  refreshWorkflowPlugins(db);
  return listWorkflowPlugins(db);
}