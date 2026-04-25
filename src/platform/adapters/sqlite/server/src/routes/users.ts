import type { Router, Request, Response } from "express";
import type Database from "better-sqlite3";

export interface AppUser {
  id: string;
  userId: string;
  employeeCode: string;
  fullName: string;
  email: string;
  branchId: string;
  departmentId: string;
  isActive: boolean;
  canLogin: boolean;
  canOwnActions: boolean;
  roles: string[];
}

interface DbUserRow {
  id: string;
  userId: string;
  employeeCode: string;
  fullName: string;
  email: string;
  branchId: string;
  departmentId: string;
  isActive: number;
  canLogin: number;
  canOwnActions: number;
}

export function registerUsersRoutes(router: Router, db: Database.Database): void {
  // GET /api/users
  router.get("/api/users", (_req: Request, res: Response) => {
    try {
      const users = db
        .prepare(
          `SELECT id, userId, employeeCode, fullName, email, branchId, departmentId, isActive, canLogin, canOwnActions
           FROM users ORDER BY fullName`
        )
        .all() as DbUserRow[];

      const result: AppUser[] = users.map((u) => {
        const roles = db
          .prepare("SELECT roleCode FROM user_roles WHERE userId = ? ORDER BY roleCode")
          .all(u.id) as Array<{ roleCode: string }>;

        return {
          ...u,
          isActive: Boolean(u.isActive),
          canLogin: Boolean(u.canLogin),
          canOwnActions: Boolean(u.canOwnActions),
          roles: roles.map((r) => r.roleCode)
        };
      });

      res.json(result);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // GET /api/users/:id
  router.get("/api/users/:id", (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const user = db
        .prepare(
          `SELECT id, userId, employeeCode, fullName, email, branchId, departmentId, isActive, canLogin, canOwnActions
           FROM users WHERE id = ?`
        )
        .get(id) as DbUserRow | undefined;

      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const roles = db
        .prepare("SELECT roleCode FROM user_roles WHERE userId = ? ORDER BY roleCode")
        .all(id) as Array<{ roleCode: string }>;

      const result: AppUser = {
        ...user,
        isActive: Boolean(user.isActive),
        canLogin: Boolean(user.canLogin),
        canOwnActions: Boolean(user.canOwnActions),
        roles: roles.map((r) => r.roleCode)
      };

      res.json(result);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // GET /api/users?branchId=xxx
  router.get("/api/users", (req: Request, res: Response) => {
    try {
      const { branchId } = req.query;

      if (!branchId || typeof branchId !== "string") {
        return;
      }

      const users = db
        .prepare(
          `SELECT id, userId, employeeCode, fullName, email, branchId, departmentId, isActive, canLogin, canOwnActions
           FROM users WHERE branchId = ? ORDER BY fullName`
        )
        .all(branchId) as DbUserRow[];

      const result: AppUser[] = users.map((u) => {
        const roles = db
          .prepare("SELECT roleCode FROM user_roles WHERE userId = ? ORDER BY roleCode")
          .all(u.id) as Array<{ roleCode: string }>;

        return {
          ...u,
          isActive: Boolean(u.isActive),
          canLogin: Boolean(u.canLogin),
          canOwnActions: Boolean(u.canOwnActions),
          roles: roles.map((r) => r.roleCode)
        };
      });

      res.json(result);
    } catch (error) {
      console.error("Error fetching users by branch:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // POST /api/users
  router.post("/api/users", (req: Request, res: Response) => {
    try {
      const { id, userId, employeeCode, fullName, email, branchId, departmentId, isActive, canLogin, canOwnActions, roles } =
        req.body as AppUser;

      if (!id || !userId || !employeeCode || !fullName || !email || !branchId || !departmentId) {
        res.status(400).json({ error: "Missing required fields" });
        return;
      }

      const stmt = db.prepare(
        `INSERT OR REPLACE INTO users (id, userId, employeeCode, fullName, email, branchId, departmentId, isActive, canLogin, canOwnActions)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );

      stmt.run(id, userId.trim(), employeeCode, fullName, email, branchId, departmentId, isActive ? 1 : 0, canLogin ? 1 : 0, canOwnActions ? 1 : 0);

      // Handle roles
      db.prepare("DELETE FROM user_roles WHERE userId = ?").run(id);
      if (Array.isArray(roles) && roles.length > 0) {
        const roleStmt = db.prepare("INSERT INTO user_roles (userId, roleCode) VALUES (?, ?)");
        for (const role of roles) {
          roleStmt.run(id, role);
        }
      }

      res.status(200).json({ message: "User saved successfully" });
    } catch (error) {
      console.error("Error saving user:", error);
      res.status(500).json({ error: "Failed to save user" });
    }
  });

  // DELETE /api/users/:id
  router.delete("/api/users/:id", (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const stmt = db.prepare("DELETE FROM users WHERE id = ?");
      const result = stmt.run(id);

      if ((result as any).changes === 0) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  });
}
