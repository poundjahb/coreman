import type { Router, Request, Response } from "express";
import type Database from "better-sqlite3";

export function registerActionDefinitionsRoutes(router: Router, db: Database.Database): void {
  // GET /api/action-definitions
  router.get("/api/action-definitions", (_req: Request, res: Response) => {
    try {
      const definitions = db
        .prepare("SELECT * FROM action_definitions ORDER BY label")
        .all();
      res.json(definitions);
    } catch (error) {
      console.error("Error fetching action definitions:", error);
      res.status(500).json({ error: "Failed to fetch action definitions" });
    }
  });

  // GET /api/action-definitions/active
  router.get("/api/action-definitions/active", (_req: Request, res: Response) => {
    try {
      const definitions = db
        .prepare("SELECT * FROM action_definitions WHERE isActive = 1 ORDER BY label")
        .all();
      res.json(definitions);
    } catch (error) {
      console.error("Error fetching active action definitions:", error);
      res.status(500).json({ error: "Failed to fetch action definitions" });
    }
  });

  // GET /api/action-definitions/:id
  router.get("/api/action-definitions/:id", (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const definition = db.prepare("SELECT * FROM action_definitions WHERE id = ?").get(id);

      if (!definition) {
        res.status(404).json({ error: "Action definition not found" });
        return;
      }

      res.json(definition);
    } catch (error) {
      console.error("Error fetching action definition:", error);
      res.status(500).json({ error: "Failed to fetch action definition" });
    }
  });

  // POST /api/action-definitions
  router.post("/api/action-definitions", (req: Request, res: Response) => {
    try {
      const {
        id,
        code,
        label,
        description,
        category,
        requiresOwner,
        triggerMode,
        workflowEnabled,
        workflowMethod,
        workflowEndpointUrl,
        workflowTimeoutMs,
        authType,
        authSecretRef,
        payloadTemplate,
        retryMaxAttempts,
        retryBackoffMs,
        defaultSlaDays,
        isActive,
        createdAt,
        updatedAt
      } = req.body;

      if (!id || !code || !label || !category) {
        res.status(400).json({ error: "Missing required fields" });
        return;
      }

      const stmt = db.prepare(`
        INSERT OR REPLACE INTO action_definitions (
          id, code, label, description, category, requiresOwner, triggerMode,
          workflowEnabled, workflowMethod, workflowEndpointUrl, workflowTimeoutMs,
          authType, authSecretRef, payloadTemplate, retryMaxAttempts, retryBackoffMs,
          defaultSlaDays, isActive, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        id,
        code,
        label,
        description || null,
        category,
        requiresOwner ? 1 : 0,
        triggerMode,
        workflowEnabled ? 1 : 0,
        workflowMethod,
        workflowEndpointUrl || null,
        workflowTimeoutMs || 10000,
        authType,
        authSecretRef || null,
        payloadTemplate || null,
        retryMaxAttempts || 0,
        retryBackoffMs || 0,
        defaultSlaDays || null,
        isActive ? 1 : 0,
        createdAt || new Date().toISOString(),
        updatedAt || new Date().toISOString()
      );

      res.status(200).json({ message: "Action definition saved successfully" });
    } catch (error) {
      console.error("Error saving action definition:", error);
      res.status(500).json({ error: "Failed to save action definition" });
    }
  });

  // DELETE /api/action-definitions/:id
  router.delete("/api/action-definitions/:id", (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const stmt = db.prepare("DELETE FROM action_definitions WHERE id = ?");
      const result = stmt.run(id);

      if ((result as any).changes === 0) {
        res.status(404).json({ error: "Action definition not found" });
        return;
      }

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting action definition:", error);
      res.status(500).json({ error: "Failed to delete action definition" });
    }
  });
}
