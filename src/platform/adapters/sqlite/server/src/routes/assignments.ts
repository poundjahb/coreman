import type { Router, Request, Response } from "express";
import type Database from "better-sqlite3";
import { randomUUID } from "crypto";
import nodemailer from "nodemailer";

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

type WorkflowMode = "BASIC" | "EXTENDED";

type EmailBackendType = "SMTP" | "GRAPH_MAIL" | "RESEND";

interface EmailConfig {
  backendType: EmailBackendType;
  fromAddress: string;
  connectionTimeoutMs: number;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser?: string;
  smtpPass?: string;
  graphAccessToken?: string;
  resendApiKey?: string;
}

type EmailSettingsRow = {
  backendType: EmailBackendType;
  config: string;
  fromAddress: string;
};

type NotificationDispatchOutcome = "SENT" | "SKIPPED" | "FAILED";

function resolveWorkflowMode(): WorkflowMode {
  const raw = process.env.VITE_WORKFLOW_MODE ?? process.env.WORKFLOW_MODE;
  if (raw === "EXTENDED") {
    return "EXTENDED";
  }

  return "BASIC";
}

function getFrontendBaseUrl(): string {
  const configured = process.env.COREMAN_FRONTEND_BASE_URL ?? process.env.VITE_APP_BASE_URL;
  if (typeof configured === "string" && configured.trim().length > 0) {
    return configured.replace(/\/$/, "");
  }

  return "http://localhost:5173";
}

function buildCorrespondenceRecordLink(correspondenceId: string): string {
  return `${getFrontendBaseUrl()}/search?correspondenceId=${encodeURIComponent(correspondenceId)}`;
}

function rowToEmailConfig(row: EmailSettingsRow): EmailConfig {
  const parsed = JSON.parse(row.config) as Record<string, unknown>;
  return {
    backendType: row.backendType,
    fromAddress: row.fromAddress,
    connectionTimeoutMs: typeof parsed.connectionTimeoutMs === "number" ? parsed.connectionTimeoutMs : 3000,
    smtpHost: typeof parsed.smtpHost === "string" ? parsed.smtpHost : undefined,
    smtpPort: typeof parsed.smtpPort === "number" ? parsed.smtpPort : undefined,
    smtpSecure: typeof parsed.smtpSecure === "boolean" ? parsed.smtpSecure : undefined,
    smtpUser: typeof parsed.smtpUser === "string" ? parsed.smtpUser : undefined,
    smtpPass: typeof parsed.smtpPass === "string" ? parsed.smtpPass : undefined,
    graphAccessToken: typeof parsed.graphAccessToken === "string" ? parsed.graphAccessToken : undefined,
    resendApiKey: typeof parsed.resendApiKey === "string" ? parsed.resendApiKey : undefined
  };
}

function getStoredEmailConfig(db: Database.Database): EmailConfig | null {
  const row = db
    .prepare("SELECT backendType, config, fromAddress FROM email_settings WHERE id = 1")
    .get() as EmailSettingsRow | undefined;

  if (!row) {
    return null;
  }

  return rowToEmailConfig(row);
}

async function sendEmailUsingConfiguredBackend(config: EmailConfig, to: string, subject: string, body: string): Promise<string | undefined> {
  if (config.backendType === "SMTP") {
    const transport = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpSecure,
      auth: config.smtpUser && config.smtpPass
        ? {
          user: config.smtpUser,
          pass: config.smtpPass
        }
        : undefined,
      connectionTimeout: config.connectionTimeoutMs,
      greetingTimeout: config.connectionTimeoutMs,
      socketTimeout: config.connectionTimeoutMs
    });

    const result = await transport.sendMail({
      from: config.fromAddress,
      to: to.trim(),
      subject,
      text: body
    });

    return result.messageId;
  }

  if (config.backendType === "GRAPH_MAIL") {
    if (!config.graphAccessToken) {
      throw new Error("Graph Mail API access token not available. Please re-authenticate through the UI.");
    }

    const response = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.graphAccessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: {
          subject,
          body: {
            contentType: "HTML",
            content: body
          },
          toRecipients: [
            {
              emailAddress: {
                address: to.trim()
              }
            }
          ]
        },
        saveToSentItems: true
      })
    });

    if (!response.ok) {
      const payload = await response.json() as { error?: { message?: string } };
      throw new Error(`Graph Mail API error: ${payload.error?.message || response.statusText}`);
    }

    return undefined;
  }

  if (config.backendType === "RESEND") {
    if (!config.resendApiKey) {
      throw new Error("Resend API key not available. Please configure it in the settings.");
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.resendApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: config.fromAddress,
        to: to.trim(),
        subject,
        html: body,
        text: body
      })
    });

    if (!response.ok) {
      const payload = await response.json() as { message?: string };
      throw new Error(`Resend API error: ${payload.message || response.statusText}`);
    }

    const payload = await response.json() as { id?: string };
    return payload.id;
  }

  throw new Error(`Unsupported email backend type: ${config.backendType}`);
}

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

function calculateAutoCloseDueDate(dueDate: string | null, receivedDate: string): Date {
  const baseDateStr = dueDate || receivedDate;
  const baseDate = new Date(baseDateStr);
  baseDate.setDate(baseDate.getDate() + 5);
  return baseDate;
}

function getStatusChangeReason(
  previousStatus: string,
  newStatus: string,
  totalTasks: number
): string {
  if (newStatus === "AUTO_CLOSED") {
    return "SLA_EXPIRY_NO_ACTION";
  }
  if (newStatus === "IN_PROGRESS") {
    return "TASK_STARTED";
  }
  if (newStatus === "CLOSED") {
    return "ALL_TASKS_COMPLETED";
  }
  if (newStatus === "CANCELLED") {
    return "ALL_TASKS_CANCELLED";
  }
  if (newStatus === "ASSIGNED") {
    return "TASKS_ASSIGNED_AWAITING_START";
  }
  return "STATUS_UPDATED";
}

function updateCorrespondenceStatusBasedOnTasks(db: Database.Database, correspondenceId: string, actorId: string): void {
  try {
    const tasks = db
      .prepare("SELECT id, status FROM correspondence_task_assignments WHERE correspondenceId = ?")
      .all(correspondenceId) as Array<{ id: string; status: string }>;

    const correspondence = db
      .prepare("SELECT status, dueDate, receivedDate FROM correspondences WHERE id = ?")
      .get(correspondenceId) as { status: string; dueDate: string | null; receivedDate: string } | undefined;

    if (!correspondence) {
      return;
    }

    let newStatus: string;
    const now = new Date();
    const autoCloseDueDate = calculateAutoCloseDueDate(correspondence.dueDate, correspondence.receivedDate);

    if (now > autoCloseDueDate && !["CLOSED", "CANCELLED"].includes(correspondence.status)) {
      newStatus = "AUTO_CLOSED";
    } else if (tasks.length === 0) {
      newStatus = "NEW";
    } else {
      const inProgressCount = tasks.filter((t) => t.status === "IN_PROGRESS").length;
      const completedCount = tasks.filter((t) => t.status === "COMPLETED").length;
      const cancelledCount = tasks.filter((t) => t.status === "CANCELLED").length;
      const allTasksCancelled = cancelledCount === tasks.length;
      const allTasksCompleted = completedCount === tasks.length;

      if (inProgressCount > 0) {
        newStatus = "IN_PROGRESS";
      } else if (allTasksCompleted) {
        newStatus = "CLOSED";
      } else if (allTasksCancelled) {
        newStatus = "CANCELLED";
      } else {
        newStatus = "ASSIGNED";
      }
    }

    if (correspondence.status !== newStatus) {
      db.prepare("UPDATE correspondences SET status = ?, updatedAt = ? WHERE id = ?")
        .run(newStatus, new Date().toISOString(), correspondenceId);

      appendAuditEvent(db, correspondenceId, "CORRESPONDENCE_STATUS_CHANGED", actorId, {
        actionName: "CORRESPONDENCE_STATUS_AUTO_UPDATED",
        actionSource: resolveActionSource(actorId),
        previousStatus: correspondence.status,
        newStatus,
        reason: getStatusChangeReason(correspondence.status, newStatus, tasks.length),
        totalTasks: tasks.length,
        completedTasks: tasks.filter((t) => t.status === "COMPLETED").length,
        inProgressTasks: tasks.filter((t) => t.status === "IN_PROGRESS").length,
        cancelledTasks: tasks.filter((t) => t.status === "CANCELLED").length
      });
    }
  } catch (error) {
    console.error("Error updating correspondence status based on tasks:", error);
  }
}

function appendNotificationAuditEvent(
  db: Database.Database,
  correspondenceId: string,
  eventType: "NOTIFICATION_SENT" | "NOTIFICATION_SKIPPED" | "NOTIFICATION_FAILED" | "WORKFLOW_FAILURE",
  status: "SUCCESS" | "SKIPPED" | "FAILED",
  actorId: string,
  payload: Record<string, unknown>,
  errorMessage?: string
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
    status,
    payloadJson,
    errorMessage ?? null,
    payloadJson,
    now,
    actorId,
    actorId
  );
}

function composeAssignmentMail(taskType: string, deadline: string, reference: string, recordLink: string): { subject: string; body: string } {
  return {
    subject: `Task assigned: ${taskType} (${reference})`,
    body: [
      "A new task has been assigned to you.",
      `Task type: ${taskType}`,
      `Deadline: ${deadline}`,
      `Correspondence: ${reference}`,
      `Open record: ${recordLink}`
    ].join("\n")
  };
}

async function dispatchAssignmentNotification(
  db: Database.Database,
  assignment: {
    id: string;
    correspondenceId: string;
    actionDefinitionId: string;
    assigneeUserId: string;
    deadline: string;
  },
  actorId: string,
  mode: WorkflowMode
): Promise<NotificationDispatchOutcome> {
  const correspondence = db.prepare("SELECT referenceNumber FROM correspondences WHERE id = ?").get(assignment.correspondenceId) as
    | { referenceNumber: string }
    | undefined;
  const actionDefinition = db.prepare("SELECT label FROM action_definitions WHERE id = ?").get(assignment.actionDefinitionId) as
    | { label: string }
    | undefined;
  const assignee = db.prepare("SELECT email FROM users WHERE id = ?").get(assignment.assigneeUserId) as
    | { email: string | null }
    | undefined;

  const reference = correspondence?.referenceNumber ?? assignment.correspondenceId;
  const taskType = actionDefinition?.label ?? assignment.actionDefinitionId;
  const recordLink = buildCorrespondenceRecordLink(assignment.correspondenceId);
  const mail = composeAssignmentMail(taskType, assignment.deadline, reference, recordLink);

  db.prepare(
    `INSERT INTO notifications (id, recipientId, subject, body, correspondenceId, sentAt)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    randomUUID(),
    assignment.assigneeUserId,
    mail.subject,
    mail.body,
    assignment.correspondenceId,
    new Date().toISOString()
  );

  const recipientEmail = assignee?.email?.trim();
  const auditContext = {
    mode,
    assignmentId: assignment.id,
    taskType,
    deadline: assignment.deadline,
    assigneeUserId: assignment.assigneeUserId,
    correspondenceId: assignment.correspondenceId,
    recordLink,
    actionSource: resolveActionSource(actorId)
  };

  if (!recipientEmail) {
    appendNotificationAuditEvent(
      db,
      assignment.correspondenceId,
      "NOTIFICATION_SKIPPED",
      "SKIPPED",
      actorId,
      {
        ...auditContext,
        reason: "RECIPIENT_EMAIL_MISSING"
      }
    );
    return "SKIPPED";
  }

  const config = getStoredEmailConfig(db);
  if (!config) {
    appendNotificationAuditEvent(
      db,
      assignment.correspondenceId,
      "NOTIFICATION_FAILED",
      "FAILED",
      actorId,
      {
        ...auditContext,
        recipientEmail
      },
      "Email settings are not configured."
    );
    return "FAILED";
  }

  try {
    const messageId = await sendEmailUsingConfiguredBackend(config, recipientEmail, mail.subject, mail.body);
    appendNotificationAuditEvent(
      db,
      assignment.correspondenceId,
      "NOTIFICATION_SENT",
      "SUCCESS",
      actorId,
      {
        ...auditContext,
        backendType: config.backendType,
        recipientEmail,
        subject: mail.subject,
        messageId
      }
    );
    return "SENT";
  } catch (error) {
    appendNotificationAuditEvent(
      db,
      assignment.correspondenceId,
      "NOTIFICATION_FAILED",
      "FAILED",
      actorId,
      {
        ...auditContext,
        backendType: config.backendType,
        recipientEmail,
        subject: mail.subject
      },
      error instanceof Error ? error.message : "Notification delivery failed"
    );
    return "FAILED";
  }
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

  router.post("/api/correspondences/:correspondenceId/assignments", async (req: Request, res: Response) => {
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

      // Update correspondence status to ASSIGNED and dueDate to the latest deadline across all tasks.
      const prevCorrespondence = db
        .prepare("SELECT status FROM correspondences WHERE id = ?")
        .get(correspondenceId) as { status: string } | undefined;
      const latestDeadlineRow = db
        .prepare("SELECT MAX(deadline) as latestDeadline FROM correspondence_task_assignments WHERE correspondenceId = ?")
        .get(correspondenceId) as { latestDeadline: string | null };
      const latestDeadline = latestDeadlineRow?.latestDeadline ?? deadline;
      db.prepare("UPDATE correspondences SET status = 'ASSIGNED', dueDate = ?, updatedAt = ? WHERE id = ?")
        .run(latestDeadline, new Date().toISOString(), correspondenceId);
      appendAuditEvent(db, correspondenceId, "CORRESPONDENCE_STATUS_CHANGED", createdBy, {
        actionName: "CORRESPONDENCE_STATUS_CHANGED",
        actionSource: resolveActionSource(createdBy),
        previousStatus: prevCorrespondence?.status ?? null,
        newStatus: "ASSIGNED",
        trigger: "ASSIGNMENT_CREATED",
        assignmentId: id,
        dueDate: latestDeadline
      });

      appendAuditEvent(db, correspondenceId, "CORRESPONDENCE_ASSIGNED", createdBy, {
        actionName: "CORRESPONDENCE_ASSIGNED",
        actionSource: resolveActionSource(createdBy),
        assignmentId: id,
        actionDefinitionId,
        assigneeUserId,
        status
      });

      const workflowMode = resolveWorkflowMode();
      try {
        const notificationOutcome = await dispatchAssignmentNotification(
          db,
          {
            id,
            correspondenceId,
            actionDefinitionId,
            assigneeUserId,
            deadline
          },
          createdBy,
          workflowMode
        );

        if (notificationOutcome === "FAILED") {
          appendNotificationAuditEvent(
            db,
            correspondenceId,
            "WORKFLOW_FAILURE",
            "FAILED",
            createdBy,
            {
              mode: workflowMode,
              actionName: "ASSIGNMENT_WORKFLOW",
              assignmentId: id,
              notificationOutcome,
              actionSource: resolveActionSource(createdBy)
            },
            "Assignment workflow notification failed"
          );
        }
      } catch (error) {
        appendNotificationAuditEvent(
          db,
          correspondenceId,
          "WORKFLOW_FAILURE",
          "FAILED",
          createdBy,
          {
            mode: workflowMode,
            actionName: "ASSIGNMENT_WORKFLOW",
            assignmentId: id,
            actionSource: resolveActionSource(createdBy)
          },
          error instanceof Error ? error.message : "Assignment workflow execution failed"
        );
      }

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

          // Update correspondence status based on all linked task assignments
          updateCorrespondenceStatusBasedOnTasks(db, assignment.correspondenceId, actorId);
        }
      }

      res.status(200).json({ message: "Assignment updated successfully" });
    } catch (error) {
      console.error("Error updating assignment:", error);
      res.status(500).json({ error: "Failed to update assignment" });
    }
  });
}
