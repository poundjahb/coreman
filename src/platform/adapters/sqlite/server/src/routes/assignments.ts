import type { Router, Request, Response } from "express";
import type Database from "better-sqlite3";
import { randomUUID } from "crypto";

const ALLOWED_STATUSES = new Set(["ASSIGNED", "IN_PROGRESS", "COMPLETED", "CANCELED"]);

type AssignmentPayload = {
  id?: string;
  actionDefinitionId?: string;
  description?: string;
  assigneeUserId?: string;
  ccUserIds?: string[];
  deadline?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
};

function parseCcUserIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.filter((item): item is string => typeof item === "string" && item.length > 0);
}

function ensureCorrespondenceExists(db: Database.Database, correspondenceId: string): boolean {
  const record = db.prepare("SELECT id FROM correspondences WHERE id = ?").get(correspondenceId) as { id: string } | undefined;
  return Boolean(record);
}

function ensureActionDefinitionExists(db: Database.Database, actionDefinitionId: string): boolean {
  const record = db
    .prepare("SELECT id FROM action_definitions WHERE id = ? AND isActive = 1")
    .get(actionDefinitionId) as { id: string } | undefined;
  return Boolean(record);
}

function ensureUserExists(db: Database.Database, userId: string): boolean {
  const record = db.prepare("SELECT id FROM users WHERE id = ? AND isActive = 1").get(userId) as { id: string } | undefined;
  return Boolean(record);
}

function resolveActionSource(actorId: string): "USER" | "SYSTEM" {
  return actorId === "SYSTEM" ? "SYSTEM" : "USER";
}

function appendAuditEvent(
  db: Database.Database,
  correspondenceId: string,
  eventType: string,
  actorId: string,
  payload: Record<string, unknown>
): void {
  const now = new Date().toISOString();
  const payloadJson = JSON.stringify(payload);
  db.prepare(
    `INSERT INTO correspondence_audit_log (
      id, correspondenceId, eventType, status, payloadJson, errorMessage, details, createdAt, createdById, createdBy
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    randomUUID(),
    correspondenceId,
    eventType,
    "SUCCESS",
    payloadJson,
    null,
    payloadJson,
    now,
    actorId,
    actorId
  );
}

export function registerAssignmentsRoutes(router: Router, db: Database.Database): void {
  router.get("/api/assignments/:id", (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const record = db
        .prepare("SELECT * FROM correspondence_task_assignments WHERE id = ?")
        .get(id) as Record<string, unknown> | undefined;

      if (!record) {
        res.status(404).json({ error: "Assignment not found" });
        return;
      }

      const normalized = {
        ...record,
        ccUserIds: (() => {
          try {
            const parsed = JSON.parse(String(record.ccUserIdsJson ?? "[]"));
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        })()
      };

      res.json(normalized);
    } catch (error) {
      console.error("Error fetching assignment by id:", error);
      res.status(500).json({ error: "Failed to fetch assignment" });
    }
  });

  router.post("/api/correspondences/:correspondenceId/assignments", (req: Request, res: Response) => {
    try {
      const { correspondenceId } = req.params;
      const payload = req.body as AssignmentPayload;
      const {
        id,
        actionDefinitionId,
        description,
        assigneeUserId,
        deadline,
        status,
        createdAt,
        updatedAt,
        createdBy,
        updatedBy
      } = payload;
      const ccUserIds = parseCcUserIds(payload.ccUserIds);

      if (!id || !actionDefinitionId || !assigneeUserId || !deadline || !status || !createdBy || !updatedBy) {
        res.status(400).json({ error: "Missing required assignment fields" });
        return;
      }

      if (!ALLOWED_STATUSES.has(status)) {
        res.status(400).json({ error: "Invalid assignment status" });
        return;
      }

      if (!ensureCorrespondenceExists(db, correspondenceId)) {
        res.status(404).json({ error: "Correspondence not found" });
        return;
      }

      if (!ensureActionDefinitionExists(db, actionDefinitionId)) {
        res.status(400).json({ error: "Action definition was not found or is inactive" });
        return;
      }

      if (!ensureUserExists(db, assigneeUserId)) {
        res.status(400).json({ error: "Assignee user was not found or is inactive" });
        return;
      }

      const invalidCcUser = ccUserIds.find((userId) => !ensureUserExists(db, userId));
      if (invalidCcUser) {
        res.status(400).json({ error: `CC user was not found or is inactive: ${invalidCcUser}` });
        return;
      }

      const stmt = db.prepare(`
        INSERT OR REPLACE INTO correspondence_task_assignments (
          id, correspondenceId, actionDefinitionId, description, assigneeUserId, ccUserIdsJson,
          deadline, status, createdAt, updatedAt, createdBy, updatedBy
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        id,
        correspondenceId,
        actionDefinitionId,
        typeof description === "string" && description.trim().length > 0 ? description.trim() : null,
        assigneeUserId,
        JSON.stringify(ccUserIds),
        deadline,
        status,
        createdAt || new Date().toISOString(),
        updatedAt || new Date().toISOString(),
        createdBy,
        updatedBy
      );

      appendAuditEvent(db, correspondenceId, "CORRESPONDENCE_ASSIGNED", createdBy, {
        actionName: "CORRESPONDENCE_ASSIGNED",
        actionSource: resolveActionSource(createdBy),
        assignmentId: id,
        actionDefinitionId,
        assigneeUserId,
        status
      });

      res.status(200).json({ message: "Assignment saved successfully" });
    } catch (error) {
      console.error("Error saving correspondence assignment:", error);
      res.status(500).json({ error: "Failed to save assignment" });
    }
  });

  router.get("/api/correspondences/:correspondenceId/assignments", (req: Request, res: Response) => {
    try {
      const { correspondenceId } = req.params;
      const records = db
        .prepare("SELECT * FROM correspondence_task_assignments WHERE correspondenceId = ? ORDER BY createdAt DESC")
        .all(correspondenceId) as Array<Record<string, unknown>>;

      const normalized = records.map((record) => ({
        ...record,
        ccUserIds: (() => {
          try {
            const parsed = JSON.parse(String(record.ccUserIdsJson ?? "[]"));
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        })()
      }));

      res.json(normalized);
    } catch (error) {
      console.error("Error fetching correspondence assignments:", error);
      res.status(500).json({ error: "Failed to fetch assignments" });
    }
  });

  router.get("/api/assignments", (req: Request, res: Response) => {
    try {
      const { assigneeUserId } = req.query;
      if (!assigneeUserId || typeof assigneeUserId !== "string") {
        res.status(400).json({ error: "assigneeUserId query parameter is required" });
        return;
      }

      const records = db
        .prepare("SELECT * FROM correspondence_task_assignments WHERE assigneeUserId = ? ORDER BY createdAt DESC")
        .all(assigneeUserId) as Array<Record<string, unknown>>;

      const normalized = records.map((record) => ({
        ...record,
        ccUserIds: (() => {
          try {
            const parsed = JSON.parse(String(record.ccUserIdsJson ?? "[]"));
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        })()
      }));

      res.json(normalized);
    } catch (error) {
      console.error("Error fetching assignee assignments:", error);
      res.status(500).json({ error: "Failed to fetch assignments" });
    }
  });

  router.patch("/api/assignments/:id", (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body as AssignmentPayload;
      const setClauses: string[] = [];
      const values: unknown[] = [];

      if (typeof updates.actionDefinitionId === "string") {
        if (!ensureActionDefinitionExists(db, updates.actionDefinitionId)) {
          res.status(400).json({ error: "Action definition was not found or is inactive" });
          return;
        }
        setClauses.push("actionDefinitionId = ?");
        values.push(updates.actionDefinitionId);
      }

      if (typeof updates.assigneeUserId === "string") {
        if (!ensureUserExists(db, updates.assigneeUserId)) {
          res.status(400).json({ error: "Assignee user was not found or is inactive" });
          return;
        }
        setClauses.push("assigneeUserId = ?");
        values.push(updates.assigneeUserId);
      }

      if (typeof updates.description === "string") {
        const normalized = updates.description.trim();
        setClauses.push("description = ?");
        values.push(normalized.length > 0 ? normalized : null);
      }

      if (Array.isArray(updates.ccUserIds)) {
        const ccUserIds = parseCcUserIds(updates.ccUserIds);
        const invalidCcUser = ccUserIds.find((userId) => !ensureUserExists(db, userId));
        if (invalidCcUser) {
          res.status(400).json({ error: `CC user was not found or is inactive: ${invalidCcUser}` });
          return;
        }

        setClauses.push("ccUserIdsJson = ?");
        values.push(JSON.stringify(ccUserIds));
      }

      if (typeof updates.deadline === "string") {
        setClauses.push("deadline = ?");
        values.push(updates.deadline);
      }

      if (typeof updates.status === "string") {
        if (!ALLOWED_STATUSES.has(updates.status)) {
          res.status(400).json({ error: "Invalid assignment status" });
          return;
        }
        setClauses.push("status = ?");
        values.push(updates.status);
      }

      if (typeof updates.updatedBy === "string" && updates.updatedBy.length > 0) {
        setClauses.push("updatedBy = ?");
        values.push(updates.updatedBy);
      }

      if (setClauses.length === 0) {
        res.status(400).json({ error: "No fields to update" });
        return;
      }

      const stmt = db.prepare(`
        UPDATE correspondence_task_assignments
        SET ${setClauses.join(", ")}, updatedAt = ?
        WHERE id = ?
      `);

      const result = stmt.run(...values, new Date().toISOString(), id);
      if (result.changes === 0) {
        res.status(404).json({ error: "Assignment not found" });
        return;
      }

      const assignment = db
        .prepare("SELECT correspondenceId FROM correspondence_task_assignments WHERE id = ?")
        .get(id) as { correspondenceId: string } | undefined;

      if (assignment) {
        const actorId = typeof updates.updatedBy === "string" && updates.updatedBy.length > 0
          ? updates.updatedBy
          : "SYSTEM";

        appendAuditEvent(db, assignment.correspondenceId, "CORRESPONDENCE_UPDATED", actorId, {
          actionName: "ASSIGNMENT_UPDATED",
          actionSource: resolveActionSource(actorId),
          assignmentId: id,
          changedFields: setClauses.map((clause) => clause.split("=")[0]?.trim()).filter(Boolean)
        });

        if (typeof updates.status === "string") {
          appendAuditEvent(db, assignment.correspondenceId, "CORRESPONDENCE_STATUS_CHANGED", actorId, {
            actionName: "ASSIGNMENT_STATUS_CHANGED",
            actionSource: resolveActionSource(actorId),
            assignmentId: id,
            status: updates.status
          });
        }
      }

      res.status(200).json({ message: "Assignment updated successfully" });
    } catch (error) {
      console.error("Error updating assignment:", error);
      res.status(500).json({ error: "Failed to update assignment" });
    }
  });
}
