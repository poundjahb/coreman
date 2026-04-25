import type { Router, Request, Response } from "express";
import type Database from "better-sqlite3";
import bcrypt from "bcryptjs";

type UserRow = {
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
  passwordHash: string | null;
};

type RoleRow = { roleCode: string };

function getUserWithRoles(db: Database.Database, userId: string): object | null {
  const user = db
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(userId) as UserRow | undefined;

  if (!user) return null;

  const roles = db
    .prepare("SELECT roleCode FROM user_roles WHERE userId = ?")
    .all(userId) as RoleRow[];

  // Never expose passwordHash to the client
  const { passwordHash: _omit, ...safeUser } = user;
  return {
    ...safeUser,
    isActive: Boolean(safeUser.isActive),
    canLogin: Boolean(safeUser.canLogin),
    canOwnActions: Boolean(safeUser.canOwnActions),
    roles: roles.map((r) => r.roleCode)
  };
}

export function registerAuthRoutes(router: Router, db: Database.Database): void {
  // POST /api/auth/login
  router.post("/api/auth/login", (req: Request, res: Response) => {
    try {
      const { userId, email, password } = req.body as { userId?: string; email?: string; password?: string };
      const loginUserId = (userId ?? email ?? "").trim();

      if (!loginUserId || !password) {
        res.status(400).json({ error: "User ID and password are required." });
        return;
      }

      const user = db
        .prepare("SELECT * FROM users WHERE LOWER(userId) = LOWER(?)")
        .get(loginUserId) as UserRow | undefined;

      if (!user) {
        res.status(401).json({ error: "Invalid email or password." });
        return;
      }

      if (!user.isActive || !user.canLogin) {
        res.status(401).json({ error: "Your account is disabled or does not have login permission." });
        return;
      }

      const hash = user.passwordHash;
      if (!hash) {
        res.status(401).json({ error: "No password has been set for this account. Contact your administrator." });
        return;
      }

      const valid = bcrypt.compareSync(password, hash);
      if (!valid) {
        res.status(401).json({ error: "Invalid email or password." });
        return;
      }

      // Create session
      req.session.userId = user.id;
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          res.status(500).json({ error: "Failed to create session." });
          return;
        }

        const safeUser = getUserWithRoles(db, user.id);
        res.status(200).json(safeUser);
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed due to a server error." });
    }
  });

  // POST /api/auth/logout
  router.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Session destroy error:", err);
        res.status(500).json({ error: "Failed to terminate session." });
        return;
      }
      res.clearCookie("coreman.sid");
      res.status(200).json({ message: "Logged out successfully." });
    });
  });

  // GET /api/auth/me
  router.get("/api/auth/me", (req: Request, res: Response) => {
    const userId = req.session.userId;
    if (!userId) {
      res.status(401).json({ error: "Not authenticated." });
      return;
    }

    const safeUser = getUserWithRoles(db, userId);
    if (!safeUser) {
      // Session references a deleted user — clean up
      req.session.destroy(() => undefined);
      res.status(401).json({ error: "Session user not found." });
      return;
    }

    res.status(200).json(safeUser);
  });

  // POST /api/auth/set-password — ADMIN only
  router.post("/api/auth/set-password", (req: Request, res: Response) => {
    try {
      const actorId = req.session.userId;
      if (!actorId) {
        res.status(401).json({ error: "Not authenticated." });
        return;
      }

      // Verify actor has ADMIN role
      const actorRoles = db
        .prepare("SELECT roleCode FROM user_roles WHERE userId = ?")
        .all(actorId) as RoleRow[];
      const isAdmin = actorRoles.some((r) => r.roleCode === "ADMIN");
      if (!isAdmin) {
        res.status(403).json({ error: "Only administrators can set passwords." });
        return;
      }

      const { userId, newPassword } = req.body as { userId?: string; newPassword?: string };
      if (!userId || !newPassword || newPassword.trim().length < 6) {
        res.status(400).json({ error: "userId and newPassword (min 6 characters) are required." });
        return;
      }

      const target = db.prepare("SELECT id FROM users WHERE id = ?").get(userId) as { id: string } | undefined;
      if (!target) {
        res.status(404).json({ error: "User not found." });
        return;
      }

      const hash = bcrypt.hashSync(newPassword.trim(), 10);
      db.prepare("UPDATE users SET passwordHash = ? WHERE id = ?").run(hash, userId);

      res.status(200).json({ message: "Password updated successfully." });
    } catch (error) {
      console.error("Set-password error:", error);
      res.status(500).json({ error: "Failed to update password." });
    }
  });
}
