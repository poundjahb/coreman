import type { Router, Request, Response } from "express";
import type Database from "better-sqlite3";

export interface Branch {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
}

export function registerBranchesRoutes(router: Router, db: Database.Database): void {
  // GET /api/branches
  router.get("/api/branches", (_req: Request, res: Response) => {
    try {
      const branches = db
        .prepare("SELECT id, code, name, isActive FROM branches ORDER BY code")
        .all() as Array<{ id: string; code: string; name: string; isActive: number }>;

      const result: Branch[] = branches.map((b) => ({
        ...b,
        isActive: Boolean(b.isActive)
      }));

      res.json(result);
    } catch (error) {
      console.error("Error fetching branches:", error);
      res.status(500).json({ error: "Failed to fetch branches" });
    }
  });

  // GET /api/branches/:id
  router.get("/api/branches/:id", (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const branch = db
        .prepare("SELECT id, code, name, isActive FROM branches WHERE id = ?")
        .get(id) as
        | { id: string; code: string; name: string; isActive: number }
        | undefined;

      if (!branch) {
        res.status(404).json({ error: "Branch not found" });
        return;
      }

      const result: Branch = {
        ...branch,
        isActive: Boolean(branch.isActive)
      };

      res.json(result);
    } catch (error) {
      console.error("Error fetching branch:", error);
      res.status(500).json({ error: "Failed to fetch branch" });
    }
  });

  // POST /api/branches
  router.post("/api/branches", (req: Request, res: Response) => {
    try {
      const { id, code, name, isActive } = req.body as Branch;

      if (!id || !code || !name) {
        res.status(400).json({ error: "Missing required fields: id, code, name" });
        return;
      }

      const stmt = db.prepare(
        `INSERT OR REPLACE INTO branches (id, code, name, isActive)
         VALUES (?, ?, ?, ?)`
      );

      stmt.run(id, code, name, isActive ? 1 : 0);

      res.status(200).json({ message: "Branch saved successfully" });
    } catch (error) {
      if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
        res.status(409).json({ error: "Branch code already exists" });
      } else {
        console.error("Error saving branch:", error);
        res.status(500).json({ error: "Failed to save branch" });
      }
    }
  });

  // DELETE /api/branches/:id
  router.delete("/api/branches/:id", (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const stmt = db.prepare("DELETE FROM branches WHERE id = ?");
      const result = stmt.run(id);

      if ((result as any).changes === 0) {
        res.status(404).json({ error: "Branch not found" });
        return;
      }

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting branch:", error);
      res.status(500).json({ error: "Failed to delete branch" });
    }
  });
}
