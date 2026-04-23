import type { Router, Request, Response } from "express";
import type Database from "better-sqlite3";

export interface Department {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
}

export function registerDepartmentsRoutes(router: Router, db: Database.Database): void {
  // GET /api/departments
  router.get("/api/departments", (_req: Request, res: Response) => {
    try {
      const departments = db
        .prepare("SELECT id, code, name, isActive FROM departments ORDER BY code")
        .all() as Array<{ id: string; code: string; name: string; isActive: number }>;

      const result: Department[] = departments.map((d) => ({
        ...d,
        isActive: Boolean(d.isActive)
      }));

      res.json(result);
    } catch (error) {
      console.error("Error fetching departments:", error);
      res.status(500).json({ error: "Failed to fetch departments" });
    }
  });

  // GET /api/departments/:id
  router.get("/api/departments/:id", (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const department = db
        .prepare("SELECT id, code, name, isActive FROM departments WHERE id = ?")
        .get(id) as
        | { id: string; code: string; name: string; isActive: number }
        | undefined;

      if (!department) {
        res.status(404).json({ error: "Department not found" });
        return;
      }

      const result: Department = {
        ...department,
        isActive: Boolean(department.isActive)
      };

      res.json(result);
    } catch (error) {
      console.error("Error fetching department:", error);
      res.status(500).json({ error: "Failed to fetch department" });
    }
  });

  // POST /api/departments
  router.post("/api/departments", (req: Request, res: Response) => {
    try {
      const { id, code, name, isActive } = req.body as Department;

      if (!id || !code || !name) {
        res.status(400).json({ error: "Missing required fields: id, code, name" });
        return;
      }

      const stmt = db.prepare(
        `INSERT OR REPLACE INTO departments (id, code, name, isActive)
         VALUES (?, ?, ?, ?)`
      );

      stmt.run(id, code, name, isActive ? 1 : 0);

      res.status(200).json({ message: "Department saved successfully" });
    } catch (error) {
      if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
        res.status(409).json({ error: "Department code already exists" });
      } else {
        console.error("Error saving department:", error);
        res.status(500).json({ error: "Failed to save department" });
      }
    }
  });

  // DELETE /api/departments/:id
  router.delete("/api/departments/:id", (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const stmt = db.prepare("DELETE FROM departments WHERE id = ?");
      const result = stmt.run(id);

      if ((result as any).changes === 0) {
        res.status(404).json({ error: "Department not found" });
        return;
      }

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting department:", error);
      res.status(500).json({ error: "Failed to delete department" });
    }
  });
}
