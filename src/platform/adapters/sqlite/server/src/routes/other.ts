import type { Router, Request, Response } from "express";
import type Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";
import multer from "multer";
import nodemailer from "nodemailer";

type CorrespondenceAuditEventType =
  | "CORRESPONDENCE_CREATED"
  | "CORRESPONDENCE_UPDATED"
  | "CORRESPONDENCE_ASSIGNED"
  | "CORRESPONDENCE_STATUS_CHANGED"
  | "AGENT_CALL"
  | "AGENT_RESPONSE"
  | "NOTIFICATION_SENT"
  | "NOTIFICATION_SKIPPED"
  | "NOTIFICATION_FAILED"
  | "WORKFLOW_FAILURE"
  | "POWERFLOW_CALL"
  | "POWERFLOW_RESPONSE";

type CorrespondenceAuditEventStatus = "SUCCESS" | "FAILED" | "SKIPPED";

type WorkflowMode = "BASIC" | "EXTENDED";

type WorkflowCorrespondence = {
  id: string;
  reference: string;
  subject: string;
  recipientId?: string;
  actionOwnerId?: string;
  dueDate?: string | Date | null;
};

type WorkflowActor = {
  id: string;
};

type ExecutePostCaptureWorkflowCommand = {
  correspondence: WorkflowCorrespondence;
  actor: WorkflowActor;
  mode: WorkflowMode;
  context?: {
    digitalContent?: string;
    metadata?: Record<string, unknown>;
  };
};

type NotificationPayload = {
  recipientId: string;
  subject: string;
  body: string;
  correspondenceId?: string;
};

/**
 * Polymorphic email config structure supporting multiple backends
 */
type EmailBackendType = "SMTP" | "GRAPH_MAIL" | "RESEND";

interface EmailConfig {
  backendType: EmailBackendType;
  fromAddress: string;
  connectionTimeoutMs: number;
  updatedAt?: string;

  // SMTP fields
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser?: string;
  smtpPass?: string;

  // Graph Mail fields
  graphTenantId?: string;
  graphClientId?: string;
  graphClientSecret?: string;
  graphAccessToken?: string;

  // Resend fields
  resendApiKey?: string;
}

type EmailSettingsRow = {
  id: string;
  backendType: EmailBackendType;
  config: string; // JSON
  fromAddress: string;
  updatedAt: string;
};

function rowToEmailConfig(row: EmailSettingsRow): EmailConfig {
  const parsed = JSON.parse(row.config);
  return {
    backendType: row.backendType,
    fromAddress: row.fromAddress,
    connectionTimeoutMs: parsed.connectionTimeoutMs,
    updatedAt: row.updatedAt,
    ...(row.backendType === "SMTP" && {
      smtpHost: parsed.smtpHost,
      smtpPort: parsed.smtpPort,
      smtpSecure: parsed.smtpSecure,
      smtpUser: parsed.smtpUser,
      smtpPass: parsed.smtpPass
    }),
    ...(row.backendType === "GRAPH_MAIL" && {
      graphTenantId: parsed.graphTenantId,
      graphClientId: parsed.graphClientId,
      graphClientSecret: parsed.graphClientSecret,
      graphAccessToken: parsed.graphAccessToken
    }),
    ...(row.backendType === "RESEND" && {
      resendApiKey: parsed.resendApiKey
    })
  };
}

function getStoredEmailConfig(db: Database.Database): EmailConfig | null {
  const row = db
    .prepare(`SELECT id, backendType, config, fromAddress, updatedAt FROM email_settings WHERE id = 1`)
    .get() as EmailSettingsRow | undefined;

  if (!row) {
    return null;
  }

  return rowToEmailConfig(row);
}

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  fromAddress: string;
  connectionTimeoutMs: number;
}

type SmtpSettingsRow = {
  host: string;
  port: number;
  secure: number;
  user: string | null;
  pass: string | null;
  fromAddress: string;
  connectionTimeoutMs: number;
};

function rowToSmtpConfig(row: SmtpSettingsRow): SmtpConfig {
  return {
    host: row.host,
    port: row.port,
    secure: row.secure === 1,
    user: row.user ?? undefined,
    pass: row.pass ?? undefined,
    fromAddress: row.fromAddress,
    connectionTimeoutMs: row.connectionTimeoutMs
  };
}

function getStoredSmtpConfig(db: Database.Database): SmtpConfig | null {
  const row = db
    .prepare(
      `SELECT host, port, secure, user, pass, fromAddress, connectionTimeoutMs
       FROM smtp_settings
       WHERE id = 1`
    )
    .get() as SmtpSettingsRow | undefined;

  if (!row) {
    return null;
  }

  return rowToSmtpConfig(row);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultAttachmentRoot = path.join(__dirname, "..", "..", "data", "files");
const maxAttachmentSizeBytes = 10 * 1024 * 1024;
const allowedAttachmentMimeTypes = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/tiff"
]);

type CorrespondencePayload = {
  id?: string;
  referenceNumber?: string;
  reference?: string;
  senderReference?: string;
  fromTo?: string;
  organisation?: string;
  branchId?: string;
  departmentId?: string;
  recipientId?: string;
  direction?: string;
  status?: string;
  subject?: string;
  correspondenceDate?: string;
  receivedDate?: string;
  dueDate?: string;
  createdAt?: string;
  updatedAt?: string;
  createBy?: string | { id?: string };
  updateBy?: string | { id?: string };
};

const uploadAttachment = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: maxAttachmentSizeBytes
  },
  fileFilter: (_req, file, cb) => {
    if (!allowedAttachmentMimeTypes.has(file.mimetype)) {
      cb(new Error("Unsupported attachment type. Allowed: PDF, PNG, JPEG, TIFF."));
      return;
    }

    cb(null, true);
  }
}).single("attachment");

function parseMultipartRequest(req: Request, res: Response): Promise<void> {
  return new Promise((resolve, reject) => {
    uploadAttachment(req, res, (error: unknown) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

function getAttachmentRootDir(): string {
  const fromEnv = process.env.COREMAN_ATTACHMENT_ROOT;
  return fromEnv && fromEnv.trim().length > 0 ? fromEnv : defaultAttachmentRoot;
}

function resolveAttachmentExtension(file: Express.Multer.File): string {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext) {
    return ext;
  }

  if (file.mimetype === "application/pdf") {
    return ".pdf";
  }

  if (file.mimetype === "image/png") {
    return ".png";
  }

  if (file.mimetype === "image/jpeg") {
    return ".jpg";
  }

  if (file.mimetype === "image/tiff") {
    return ".tiff";
  }

  return ".bin";
}

/**
 * Backend-specific test implementations
 */
async function testSmtpBackend(config: EmailConfig, to: string, subject: string | undefined, body: string | undefined, res: Response): Promise<void> {
  try {
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

    await transport.sendMail({
      from: config.fromAddress,
      to: to.trim(),
      subject: subject ?? "SMTP Test Email",
      text: body ?? "SMTP configuration test completed successfully."
    });

    res.status(200).json({ message: "Test email sent via SMTP" });
  } catch (error) {
    console.error("Error sending SMTP test email:", error);
    const rawMessage = error instanceof Error ? error.message : "Failed to send test email";
    const normalizedMessage = rawMessage.toLowerCase();
    const errorCode =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code?: unknown }).code ?? "")
        : "";

    if (normalizedMessage.includes("tls_validate_record_header") || normalizedMessage.includes("wrong version number")) {
      res.status(500).json({
        error:
          "SMTP TLS handshake failed (wrong version number). This usually means TLS mode does not match the server port. " +
          "Use Secure TLS = OFF for plain SMTP/STARTTLS ports (commonly 587 or local test ports like 1025), " +
          "and Secure TLS = ON for implicit TLS ports (commonly 465)."
      });
      return;
    }

    if (errorCode === "ETIMEDOUT" || normalizedMessage.includes("timeout")) {
      res.status(500).json({
        error:
          "SMTP connection timed out while connecting to the server. " +
          "Verify host/port reachability, SMTP server availability, firewall rules, and connection timeout value. " +
          "If using a local test server, ensure it is running and listening on the configured host and port."
      });
      return;
    }

    if (
      normalizedMessage.includes("5.7.139") ||
      normalizedMessage.includes("security defaults policy") ||
      normalizedMessage.includes("user is locked by your organization's security defaults policy")
    ) {
      res.status(500).json({
        error:
          "Microsoft 365 rejected SMTP authentication (535 5.7.139) because Security Defaults blocks this sign-in method. " +
          "Ask your Microsoft 365 administrator to allow Authenticated SMTP for this mailbox (and tenant policy), or switch this app to Microsoft Graph Mail API (OAuth) instead of SMTP password auth."
      });
      return;
    }

    res.status(500).json({ error: rawMessage });
  }
}

async function testGraphMailBackend(config: EmailConfig, to: string, subject: string | undefined, body: string | undefined, res: Response): Promise<void> {
  try {
    if (!config.graphAccessToken) {
      res.status(400).json({ error: "Graph Mail API access token not available. Please re-authenticate through the UI." });
      return;
    }

    const response = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.graphAccessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: {
          subject: subject ?? "Graph Mail API Test Email",
          body: {
            contentType: "HTML",
            content: body ?? "Graph Mail API configuration test completed successfully."
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
      const errorPayload = await response.json() as { error?: { message?: string } };
      res.status(500).json({ error: `Graph Mail API error: ${errorPayload.error?.message || response.statusText}` });
      return;
    }

    res.status(200).json({ message: "Test email sent via Graph Mail API" });
  } catch (error) {
    console.error("Error sending Graph Mail API test email:", error);
    const message = error instanceof Error ? error.message : "Failed to send test email";
    res.status(500).json({ error: `Graph Mail API error: ${message}` });
  }
}

async function testResendBackend(config: EmailConfig, to: string, subject: string | undefined, body: string | undefined, res: Response): Promise<void> {
  try {
    if (!config.resendApiKey) {
      res.status(400).json({ error: "Resend API key not available. Please configure it in the settings." });
      return;
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.resendApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: config.fromAddress,
        to: to.trim(),
        subject: subject ?? "Resend Test Email",
        html: body ?? "Resend configuration test completed successfully.",
        text: body ?? "Resend configuration test completed successfully."
      })
    });

    if (!response.ok) {
      const errorPayload = await response.json() as { message?: string };
      res.status(500).json({ error: `Resend API error: ${errorPayload.message || response.statusText}` });
      return;
    }

    res.status(200).json({ message: "Test email sent via Resend" });
  } catch (error) {
    console.error("Error sending Resend test email:", error);
    const message = error instanceof Error ? error.message : "Failed to send test email";
    res.status(500).json({ error: `Resend error: ${message}` });
  }
}

type AuditEventInput = {
  correspondenceId: string;
  eventType: CorrespondenceAuditEventType;
  status: CorrespondenceAuditEventStatus;
  payloadJson?: string;
  errorMessage?: string;
  createdById: string;
  createdAt?: string;
};

type NotificationDispatchOutcome = "SENT" | "SKIPPED" | "FAILED";

function resolveActionSource(actorId: string): "USER" | "SYSTEM" {
  return actorId === "SYSTEM" ? "SYSTEM" : "USER";
}

function appendAuditEvent(db: Database.Database, input: AuditEventInput): void {
  const createdAt = input.createdAt ?? new Date().toISOString();
  db.prepare(
    `INSERT INTO correspondence_audit_log (
      id, correspondenceId, eventType, status, payloadJson, errorMessage, details, createdAt, createdById, createdBy
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    randomUUID(),
    input.correspondenceId,
    input.eventType,
    input.status,
    input.payloadJson ?? null,
    input.errorMessage ?? null,
    input.payloadJson ?? null,
    createdAt,
    input.createdById,
    input.createdById
  );
}

function composeBasicMail(reference: string, subject: string): { subject: string; body: string } {
  return {
    subject: `Correspondence ${reference} received`,
    body: [
      "A new correspondence has been captured and assigned.",
      `Reference: ${reference}`,
      `Subject: ${subject}`
    ].join("\n")
  };
}

function composeExtendedMail(reference: string): { subject: string; body: string } {
  return {
    subject: `Action required: ${reference}`,
    body: [
      "The correspondence has been analyzed by the simulated agent.",
      `Summary: Automated summary for ${reference}`,
      "Suggested action: Assign to action owner and acknowledge sender"
    ].join("\n")
  };
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
        "Authorization": `Bearer ${config.graphAccessToken}`,
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
        "Authorization": `Bearer ${config.resendApiKey}`,
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

async function dispatchNotification(
  db: Database.Database,
  payload: NotificationPayload,
  createdById: string,
  mode: "BASIC" | "EXTENDED"
): Promise<NotificationDispatchOutcome> {
  db.prepare(
    `INSERT INTO notifications (id, recipientId, subject, body, correspondenceId, sentAt)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    randomUUID(),
    payload.recipientId,
    payload.subject,
    payload.body,
    payload.correspondenceId ?? null,
    new Date().toISOString()
  );

  const recipientRow = db.prepare("SELECT email FROM users WHERE id = ?").get(payload.recipientId) as
    | { email: string | null }
    | undefined;
  const recipientEmail = recipientRow?.email?.trim();

  if (!payload.correspondenceId) {
    return "FAILED";
  }

  if (!recipientEmail) {
    appendAuditEvent(db, {
      correspondenceId: payload.correspondenceId,
      eventType: "NOTIFICATION_SKIPPED",
      status: "SKIPPED",
      payloadJson: JSON.stringify({
        mode,
        recipientId: payload.recipientId,
        reason: "RECIPIENT_EMAIL_MISSING",
        actionSource: resolveActionSource(createdById)
      }),
      createdById
    });
    return "SKIPPED";
  }

  const config = getStoredEmailConfig(db);
  if (!config) {
    appendAuditEvent(db, {
      correspondenceId: payload.correspondenceId,
      eventType: "NOTIFICATION_FAILED",
      status: "FAILED",
      payloadJson: JSON.stringify({
        mode,
        recipientId: payload.recipientId,
        actionSource: resolveActionSource(createdById)
      }),
      errorMessage: "Email settings are not configured.",
      createdById
    });
    return "FAILED";
  }

  try {
    const messageId = await sendEmailUsingConfiguredBackend(config, recipientEmail, payload.subject, payload.body);
    appendAuditEvent(db, {
      correspondenceId: payload.correspondenceId,
      eventType: "NOTIFICATION_SENT",
      status: "SUCCESS",
      payloadJson: JSON.stringify({
        mode,
        backendType: config.backendType,
        recipientId: payload.recipientId,
        recipientEmail,
        subject: payload.subject,
        messageId,
        actionSource: resolveActionSource(createdById)
      }),
      createdById
    });
    return "SENT";
  } catch (error) {
    appendAuditEvent(db, {
      correspondenceId: payload.correspondenceId,
      eventType: "NOTIFICATION_FAILED",
      status: "FAILED",
      payloadJson: JSON.stringify({
        mode,
        backendType: config.backendType,
        recipientId: payload.recipientId,
        recipientEmail,
        subject: payload.subject,
        actionSource: resolveActionSource(createdById)
      }),
      errorMessage: error instanceof Error ? error.message : "Notification delivery failed",
      createdById
    });
    return "FAILED";
  }
}

export function registerOtherRoutes(router: Router, db: Database.Database): void {
  // Reference configs
  router.get("/api/reference-configs", (_req: Request, res: Response) => {
    try {
      const configs = db.prepare("SELECT * FROM reference_configs ORDER BY scope").all();
      res.json(configs);
    } catch (error) {
      console.error("Error fetching reference configs:", error);
      res.status(500).json({ error: "Failed to fetch reference configs" });
    }
  });

  router.get("/api/reference-configs/active", (_req: Request, res: Response) => {
    try {
      const configs = db.prepare("SELECT * FROM reference_configs WHERE isActive = 1 ORDER BY scope").all();
      res.json(configs);
    } catch (error) {
      console.error("Error fetching active reference configs:", error);
      res.status(500).json({ error: "Failed to fetch reference configs" });
    }
  });

  // Correspondences
  router.get("/api/correspondences", (req: Request, res: Response) => {
    try {
      const { branchId } = req.query;

      let query = "SELECT * FROM correspondences";
      const params: string[] = [];

      if (branchId && typeof branchId === "string") {
        query += " WHERE branchId = ?";
        params.push(branchId);
      }

      query += " ORDER BY receivedDate DESC";

      const correspondences = db.prepare(query).all(...params);
      res.json(correspondences);
    } catch (error) {
      console.error("Error fetching correspondences:", error);
      res.status(500).json({ error: "Failed to fetch correspondences" });
    }
  });

  router.get("/api/correspondences/:id", (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const correspondence = db.prepare("SELECT * FROM correspondences WHERE id = ?").get(id);

      if (!correspondence) {
        res.status(404).json({ error: "Correspondence not found" });
        return;
      }

      res.json(correspondence);
    } catch (error) {
      console.error("Error fetching correspondence:", error);
      res.status(500).json({ error: "Failed to fetch correspondence" });
    }
  });

  router.get("/api/correspondences/:id/attachments/download", (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const record = db
        .prepare("SELECT attachmentFileName, attachmentRelativePath FROM correspondences WHERE id = ?")
        .get(id) as { attachmentFileName: string | null; attachmentRelativePath: string | null } | undefined;

      if (!record) {
        res.status(404).json({ error: "Correspondence not found" });
        return;
      }

      if (!record.attachmentFileName || !record.attachmentRelativePath) {
        res.status(404).json({ error: "No attachment found for this correspondence" });
        return;
      }

      const rootDir = path.resolve(getAttachmentRootDir());
      const absolutePath = path.resolve(rootDir, record.attachmentRelativePath);
      const insideRoot = absolutePath === rootDir || absolutePath.startsWith(`${rootDir}${path.sep}`);
      if (!insideRoot) {
        res.status(403).json({ error: "Attachment path is invalid" });
        return;
      }

      if (!fs.existsSync(absolutePath)) {
        res.status(404).json({ error: "Attachment file was not found in storage" });
        return;
      }

      res.download(absolutePath, record.attachmentFileName);
    } catch (error) {
      console.error("Error downloading correspondence attachment:", error);
      res.status(500).json({ error: "Failed to download attachment" });
    }
  });

  router.get("/api/correspondences/:id/attachments/preview", (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const record = db
        .prepare("SELECT attachmentFileName, attachmentRelativePath, attachmentMimeType FROM correspondences WHERE id = ?")
        .get(id) as { attachmentFileName: string | null; attachmentRelativePath: string | null; attachmentMimeType: string | null } | undefined;

      if (!record) {
        res.status(404).json({ error: "Correspondence not found" });
        return;
      }

      if (!record.attachmentFileName || !record.attachmentRelativePath) {
        res.status(404).json({ error: "No attachment found for this correspondence" });
        return;
      }

      const rootDir = path.resolve(getAttachmentRootDir());
      const absolutePath = path.resolve(rootDir, record.attachmentRelativePath);
      const insideRoot = absolutePath === rootDir || absolutePath.startsWith(`${rootDir}${path.sep}`);
      if (!insideRoot) {
        res.status(403).json({ error: "Attachment path is invalid" });
        return;
      }

      if (!fs.existsSync(absolutePath)) {
        res.status(404).json({ error: "Attachment file was not found in storage" });
        return;
      }

      const mimeType = record.attachmentMimeType ?? "application/octet-stream";
      res.setHeader("Content-Type", mimeType);
      res.setHeader("Content-Disposition", `inline; filename="${record.attachmentFileName}"`);
      res.sendFile(absolutePath);
    } catch (error) {
      console.error("Error previewing correspondence attachment:", error);
      res.status(500).json({ error: "Failed to preview attachment" });
    }
  });

  router.post("/api/correspondences", async (req: Request, res: Response) => {
    try {
      let payload = req.body as CorrespondencePayload;
      let attachmentFile: Express.Multer.File | undefined;

      if (req.is("multipart/form-data")) {
        await parseMultipartRequest(req, res);
        const rawPayload = req.body.payload;

        if (typeof rawPayload !== "string") {
          res.status(400).json({ error: "Missing multipart payload field." });
          return;
        }

        payload = JSON.parse(rawPayload) as CorrespondencePayload;
        attachmentFile = req.file;
      }

      const {
        id,
        referenceNumber,
        reference,
        senderReference,
        fromTo,
        organisation,
        branchId,
        departmentId,
        recipientId,
        direction,
        status,
        subject,
        correspondenceDate,
        receivedDate,
        dueDate,
        createdAt,
        updatedAt,
        createBy,
        updateBy
      } = payload;

      const resolvedReferenceNumber = referenceNumber ?? reference;
      const resolvedCreateBy = typeof createBy === "object" ? createBy?.id : createBy;
      const resolvedUpdateBy = typeof updateBy === "object" ? updateBy?.id : updateBy;
      const hasRoutingTarget = Boolean(departmentId) || Boolean(recipientId);

      if (!id || !resolvedReferenceNumber || !fromTo || !branchId || !direction || !status || !subject || !receivedDate || !hasRoutingTarget) {
        res.status(400).json({ error: "Missing required fields" });
        return;
      }

      let attachmentFileName: string | null = null;
      let attachmentRelativePath: string | null = null;
      let attachmentMimeType: string | null = null;
      let attachmentSizeBytes: number | null = null;
      let attachmentUploadedAt: string | null = null;

      if (attachmentFile) {
        const timestamp = createdAt ?? new Date().toISOString();
        const date = new Date(timestamp);
        const year = String(date.getUTCFullYear());
        const month = String(date.getUTCMonth() + 1).padStart(2, "0");
        const extension = resolveAttachmentExtension(attachmentFile);
        const finalFileName = `${id}${extension}`;
        const rootDir = getAttachmentRootDir();
        const targetDir = path.join(rootDir, year, month, id);
        const tempPath = path.join(targetDir, `${id}.${randomUUID()}.tmp`);
        const finalPath = path.join(targetDir, finalFileName);

        fs.mkdirSync(targetDir, { recursive: true });
        fs.writeFileSync(tempPath, attachmentFile.buffer);
        fs.renameSync(tempPath, finalPath);

        attachmentFileName = finalFileName;
        attachmentRelativePath = path.relative(rootDir, finalPath).split(path.sep).join("/");
        attachmentMimeType = attachmentFile.mimetype;
        attachmentSizeBytes = attachmentFile.size;
        attachmentUploadedAt = new Date().toISOString();
      }

      const normalizedDepartmentId = departmentId || (recipientId ? "__INDIVIDUAL__" : null);

      const stmt = db.prepare(`
        INSERT OR REPLACE INTO correspondences (
          id, referenceNumber, senderReference, fromTo, organisation, branchId, departmentId, recipientId, direction, status, subject,
          correspondenceDate, receivedDate, dueDate, createdAt, updatedAt,
          attachmentFileName, attachmentRelativePath, attachmentMimeType, attachmentSizeBytes, attachmentUploadedAt,
          createBy, updateBy
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        id,
        resolvedReferenceNumber,
        senderReference || null,
        fromTo,
        organisation || null,
        branchId,
        normalizedDepartmentId,
        recipientId || null,
        direction,
        status,
        subject,
        correspondenceDate || null,
        receivedDate,
        dueDate || null,
        createdAt,
        updatedAt,
        attachmentFileName,
        attachmentRelativePath,
        attachmentMimeType,
        attachmentSizeBytes,
        attachmentUploadedAt,
        resolvedCreateBy || "SYSTEM",
        resolvedUpdateBy || resolvedCreateBy || "SYSTEM"
      );

      appendAuditEvent(db, {
        correspondenceId: id,
        eventType: "CORRESPONDENCE_CREATED",
        status: "SUCCESS",
        payloadJson: JSON.stringify({
          actionName: "CORRESPONDENCE_CREATED",
          actionSource: resolveActionSource(resolvedCreateBy || "SYSTEM"),
          referenceNumber: resolvedReferenceNumber,
          recipientId: recipientId || null,
          subject,
          direction
        }),
        createdById: resolvedCreateBy || "SYSTEM"
      });

      res.status(200).json({ message: "Correspondence saved successfully" });
    } catch (error) {
      if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
        res.status(400).json({ error: "Attachment exceeds 10 MB limit." });
        return;
      }

      console.error("Error saving correspondence:", error);
      const message = error instanceof Error ? error.message : "Failed to save correspondence";
      res.status(500).json({ error: message });
    }
  });

  router.patch("/api/correspondences/:id", (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const actorIdRaw = req.header("x-user-id") || (typeof updates?.updateBy === "string" ? updates.updateBy : undefined);
      const actorId = actorIdRaw && actorIdRaw.trim().length > 0 ? actorIdRaw : "SYSTEM";
      const changedFields = Object.keys(updates ?? {});

      if (changedFields.length === 0) {
        res.status(400).json({ error: "No fields to update" });
        return;
      }

      const setClauses = changedFields
        .map((key) => `${key} = ?`)
        .join(", ");
      const values = Object.values(updates);

      const stmt = db.prepare(`UPDATE correspondences SET ${setClauses}, updatedAt = ? WHERE id = ?`);
      const result = stmt.run(...values, new Date().toISOString(), id);

      if ((result as any).changes === 0) {
        res.status(404).json({ error: "Correspondence not found" });
        return;
      }

      appendAuditEvent(db, {
        correspondenceId: id,
        eventType: "CORRESPONDENCE_UPDATED",
        status: "SUCCESS",
        payloadJson: JSON.stringify({
          actionName: "CORRESPONDENCE_UPDATED",
          actionSource: resolveActionSource(actorId),
          changedFields
        }),
        createdById: actorId
      });

      if (changedFields.includes("status") && typeof updates.status === "string") {
        appendAuditEvent(db, {
          correspondenceId: id,
          eventType: "CORRESPONDENCE_STATUS_CHANGED",
          status: "SUCCESS",
          payloadJson: JSON.stringify({
            actionName: "CORRESPONDENCE_STATUS_CHANGED",
            actionSource: resolveActionSource(actorId),
            status: updates.status
          }),
          createdById: actorId
        });
      }

      res.status(200).json({ message: "Correspondence updated successfully" });
    } catch (error) {
      console.error("Error updating correspondence:", error);
      res.status(500).json({ error: "Failed to update correspondence" });
    }
  });

  // Audit log
  router.get("/api/correspondence-audit-log", (req: Request, res: Response) => {
    try {
      const { correspondenceId } = req.query;

      if (!correspondenceId || typeof correspondenceId !== "string") {
        res.status(400).json({ error: "Missing correspondenceId query parameter" });
        return;
      }

      const events = db
        .prepare(
          `SELECT
             id,
             correspondenceId,
             eventType,
             COALESCE(status, 'SUCCESS') AS status,
             COALESCE(payloadJson, details) AS payloadJson,
             errorMessage,
             createdAt,
             COALESCE(createdById, createdBy, 'SYSTEM') AS createdById
           FROM correspondence_audit_log
           WHERE correspondenceId = ?
           ORDER BY createdAt DESC`
        )
        .all(correspondenceId);

      res.json(events);
    } catch (error) {
      console.error("Error fetching audit log:", error);
      res.status(500).json({ error: "Failed to fetch audit log" });
    }
  });

  router.post("/api/correspondence-audit-log", (req: Request, res: Response) => {
    try {
      const {
        correspondenceId,
        eventType,
        status,
        payloadJson,
        errorMessage,
        createdAt,
        createdById,
        details,
        createdBy
      } = req.body as {
        correspondenceId?: string;
        eventType?: CorrespondenceAuditEventType;
        status?: CorrespondenceAuditEventStatus;
        payloadJson?: string;
        errorMessage?: string;
        createdAt?: string;
        createdById?: string;
        details?: string;
        createdBy?: string;
      };

      const normalizedCreatedById = createdById || createdBy || "SYSTEM";

      if (!correspondenceId || !eventType) {
        res.status(400).json({ error: "Missing required fields" });
        return;
      }

      const id = randomUUID();
      const normalizedStatus = status ?? "SUCCESS";
      const normalizedPayloadJson = payloadJson ?? details;

      db.prepare(
        `INSERT INTO correspondence_audit_log (
          id, correspondenceId, eventType, status, payloadJson, errorMessage, details, createdAt, createdById, createdBy
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        id,
        correspondenceId,
        eventType,
        normalizedStatus,
        normalizedPayloadJson ?? null,
        errorMessage ?? null,
        normalizedPayloadJson ?? null,
        createdAt || new Date().toISOString(),
        normalizedCreatedById,
        normalizedCreatedById
      );

      const result = db.prepare(
        `SELECT
           id,
           correspondenceId,
           eventType,
           COALESCE(status, 'SUCCESS') AS status,
           COALESCE(payloadJson, details) AS payloadJson,
           errorMessage,
           createdAt,
           COALESCE(createdById, createdBy, 'SYSTEM') AS createdById
         FROM correspondence_audit_log
         WHERE id = ?`
      ).get(id);
      res.status(201).json(result);
    } catch (error) {
      console.error("Error creating audit log entry:", error);
      res.status(500).json({ error: "Failed to create audit log entry" });
    }
  });

  // Email Settings (polymorphic backend support)
  router.get("/api/email-settings", (_req: Request, res: Response) => {
    try {
      const storedConfig = getStoredEmailConfig(db);
      if (!storedConfig) {
        res.status(404).json({ error: "Email settings are not configured yet. Select a backend (SMTP, Graph Mail API, or Resend) and save configuration." });
        return;
      }

      res.json(storedConfig);
    } catch (error) {
      console.error("Error loading email settings:", error);
      res.status(500).json({ error: "Failed to load email settings" });
    }
  });

  router.put("/api/email-settings", (req: Request, res: Response) => {
    try {
      const { backendType, fromAddress, connectionTimeoutMs, ...backendConfig } = req.body as EmailConfig;

      if (!backendType || !fromAddress || !Number.isFinite(connectionTimeoutMs) || connectionTimeoutMs <= 0) {
        res.status(400).json({ error: "Invalid email settings payload: backendType, fromAddress, and connectionTimeoutMs are required" });
        return;
      }

      // Validate backend-specific config
      if (backendType === "SMTP") {
        const { smtpHost, smtpPort, smtpSecure } = backendConfig as EmailConfig;
        if (!smtpHost || !Number.isFinite(smtpPort ?? NaN) || (smtpPort ?? 0) <= 0 || typeof smtpSecure !== "boolean") {
          res.status(400).json({ error: "SMTP backend requires: smtpHost, smtpPort (positive number), and smtpSecure (boolean)" });
          return;
        }
      } else if (backendType === "GRAPH_MAIL") {
        const { graphTenantId, graphClientId, graphClientSecret } = backendConfig as EmailConfig;
        if (!graphTenantId || !graphClientId || !graphClientSecret) {
          res.status(400).json({ error: "Graph Mail API backend requires: graphTenantId, graphClientId, and graphClientSecret" });
          return;
        }
      } else if (backendType === "RESEND") {
        const { resendApiKey } = backendConfig as EmailConfig;
        if (!resendApiKey) {
          res.status(400).json({ error: "Resend backend requires: resendApiKey" });
          return;
        }
      } else {
        res.status(400).json({ error: `Unknown backend type: ${backendType}. Must be SMTP, GRAPH_MAIL, or RESEND` });
        return;
      }

      db.prepare(
        `INSERT INTO email_settings
          (id, backendType, config, fromAddress, updatedAt)
         VALUES
          (1, @backendType, @config, @fromAddress, @updatedAt)
         ON CONFLICT(id)
         DO UPDATE SET
           backendType = excluded.backendType,
           config = excluded.config,
           fromAddress = excluded.fromAddress,
           updatedAt = excluded.updatedAt`
      ).run({
        backendType,
        config: JSON.stringify(backendConfig),
        fromAddress,
        updatedAt: new Date().toISOString()
      });

      res.status(200).json({ message: `Email settings updated (${backendType})` });
    } catch (error) {
      console.error("Error saving email settings:", error);
      res.status(500).json({ error: "Failed to save email settings" });
    }
  });

  router.post("/api/email-settings/test", async (req: Request, res: Response) => {
    try {
      const { to, subject, body } = req.body as { to?: string; subject?: string; body?: string };
      if (!to || !to.trim()) {
        res.status(400).json({ error: "Recipient email is required" });
        return;
      }

      const config = getStoredEmailConfig(db);
      if (!config) {
        res.status(409).json({ error: "Email settings are not configured yet. Save configuration before sending a test email." });
        return;
      }

      // Dispatch to backend-specific test implementation
      if (config.backendType === "SMTP") {
        await testSmtpBackend(config, to, subject, body, res);
      } else if (config.backendType === "GRAPH_MAIL") {
        await testGraphMailBackend(config, to, subject, body, res);
      } else if (config.backendType === "RESEND") {
        await testResendBackend(config, to, subject, body, res);
      } else {
        res.status(500).json({ error: `Unknown backend type: ${config.backendType}` });
      }
    } catch (error) {
      console.error("Error in email test route:", error);
      res.status(500).json({ error: "Unexpected error during test email" });
    }
  });

  // Legacy /api/smtp-settings route (redirect to generic email settings)
  router.get("/api/smtp-settings", (_req: Request, res: Response) => {
    try {
      const storedConfig = getStoredSmtpConfig(db);
      if (!storedConfig) {
        res.status(404).json({ error: "SMTP settings are not configured yet." });
        return;
      }

      res.json({
        ...storedConfig,
        source: "stored"
      });
    } catch (error) {
      console.error("Error loading SMTP settings:", error);
      res.status(500).json({ error: "Failed to load SMTP settings" });
    }
  });

  router.put("/api/smtp-settings", (req: Request, res: Response) => {
    try {
      const { host, port, secure, user, pass, fromAddress, connectionTimeoutMs } = req.body as SmtpConfig;

      if (!host || !fromAddress || !Number.isFinite(port) || port <= 0 || !Number.isFinite(connectionTimeoutMs) || connectionTimeoutMs <= 0) {
        res.status(400).json({ error: "Invalid SMTP settings payload" });
        return;
      }

      db.prepare(
        `INSERT INTO smtp_settings
          (id, host, port, secure, user, pass, fromAddress, connectionTimeoutMs, updatedAt)
         VALUES
          (1, @host, @port, @secure, @user, @pass, @fromAddress, @connectionTimeoutMs, @updatedAt)
         ON CONFLICT(id)
         DO UPDATE SET
           host = excluded.host,
           port = excluded.port,
           secure = excluded.secure,
           user = excluded.user,
           pass = excluded.pass,
           fromAddress = excluded.fromAddress,
           connectionTimeoutMs = excluded.connectionTimeoutMs,
           updatedAt = excluded.updatedAt`
      ).run({
        host,
        port,
        secure: secure ? 1 : 0,
        user: user || null,
        pass: pass || null,
        fromAddress,
        connectionTimeoutMs,
        updatedAt: new Date().toISOString()
      });

      res.status(200).json({ message: "SMTP settings updated" });
    } catch (error) {
      console.error("Error saving SMTP settings:", error);
      res.status(500).json({ error: "Failed to save SMTP settings" });
    }
  });

  router.post("/api/smtp-settings/test", async (req: Request, res: Response) => {
    try {
      const { to, subject, body } = req.body as { to?: string; subject?: string; body?: string };
      if (!to || !to.trim()) {
        res.status(400).json({ error: "Recipient email is required" });
        return;
      }

      const config = getStoredSmtpConfig(db);
      if (!config) {
        res.status(409).json({ error: "SMTP settings are not configured yet. Save configuration before sending a test email." });
        return;
      }

      const transport = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: config.user && config.pass
          ? {
            user: config.user,
            pass: config.pass
          }
          : undefined,
        connectionTimeout: config.connectionTimeoutMs,
        greetingTimeout: config.connectionTimeoutMs,
        socketTimeout: config.connectionTimeoutMs
      });

      await transport.sendMail({
        from: config.fromAddress,
        to: to.trim(),
        subject: subject ?? "SMTP Test Email",
        text: body ?? "SMTP configuration test completed successfully."
      });

      res.status(200).json({ message: "Test email sent" });
    } catch (error) {
      console.error("Error sending SMTP test email:", error);
      const rawMessage = error instanceof Error ? error.message : "Failed to send test email";
      const normalizedMessage = rawMessage.toLowerCase();
      const errorCode =
        typeof error === "object" && error !== null && "code" in error
          ? String((error as { code?: unknown }).code ?? "")
          : "";

      if (normalizedMessage.includes("tls_validate_record_header") || normalizedMessage.includes("wrong version number")) {
        res.status(500).json({
          error:
            "SMTP TLS handshake failed (wrong version number). This usually means TLS mode does not match the server port. " +
            "Use Secure TLS = OFF for plain SMTP/STARTTLS ports (commonly 587 or local test ports like 1025), " +
            "and Secure TLS = ON for implicit TLS ports (commonly 465)."
        });
        return;
      }

      if (errorCode === "ETIMEDOUT" || normalizedMessage.includes("timeout")) {
        res.status(500).json({
          error:
            "SMTP connection timed out while connecting to the server. " +
            "Verify host/port reachability, SMTP server availability, firewall rules, and connection timeout value. " +
            "If using a local test server, ensure it is running and listening on the configured host and port."
        });
        return;
      }

      if (
        normalizedMessage.includes("5.7.139") ||
        normalizedMessage.includes("security defaults policy") ||
        normalizedMessage.includes("user is locked by your organization's security defaults policy")
      ) {
        res.status(500).json({
          error:
            "Microsoft 365 rejected SMTP authentication (535 5.7.139) because Security Defaults blocks this sign-in method. " +
            "Ask your Microsoft 365 administrator to allow Authenticated SMTP for this mailbox (and tenant policy), or switch this app to Microsoft Graph Mail API (OAuth) instead of SMTP password auth."
        });
        return;
      }

      res.status(500).json({ error: rawMessage });
    }
  });

  // Notifications
  router.post("/api/notifications", async (req: Request, res: Response) => {
    try {
      const payload = req.body as NotificationPayload;
      const actorId = req.header("x-user-id") || "SYSTEM";

      if (!payload?.recipientId || !payload?.subject || !payload?.body || !payload?.correspondenceId) {
        res.status(400).json({ error: "recipientId, subject, body, and correspondenceId are required" });
        return;
      }

      const outcome = await dispatchNotification(db, payload, actorId, "BASIC");
      res.status(200).json({ message: "Notification processed", outcome });
    } catch (error) {
      console.error("Error sending notification:", error);
      res.status(500).json({ error: "Failed to send notification" });
    }
  });

  // Sequences
  router.post("/api/sequences/next", (req: Request, res: Response) => {
    try {
      const { key } = req.body;

      if (!key) {
        res.status(400).json({ error: "Missing key parameter" });
        return;
      }

      // For now, return a random number. In production, use atomic counters.
      const value = Math.floor(Math.random() * 10000);
      res.json({ value });
    } catch (error) {
      console.error("Error getting sequence:", error);
      res.status(500).json({ error: "Failed to get sequence" });
    }
  });

  // Post-capture workflow
  router.post("/api/post-capture-workflow/execute", async (req: Request, res: Response) => {
    try {
      const command = req.body as ExecutePostCaptureWorkflowCommand;

      if (!command?.correspondence?.id || !command?.actor?.id || !command?.mode) {
        res.status(400).json({ error: "Invalid workflow command payload" });
        return;
      }

      const correspondence = command.correspondence;
      const actor = command.actor;
      const recipientId = correspondence.recipientId ?? correspondence.actionOwnerId ?? actor.id;

      if (command.mode === "EXTENDED") {
        appendAuditEvent(db, {
          correspondenceId: correspondence.id,
          eventType: "AGENT_CALL",
          status: "SUCCESS",
          payloadJson: JSON.stringify({
            reference: correspondence.reference,
            metadata: command.context?.metadata ?? {},
            hasDigitalContent: Boolean(command.context?.digitalContent),
            actionSource: resolveActionSource(actor.id)
          }),
          createdById: actor.id
        });

        appendAuditEvent(db, {
          correspondenceId: correspondence.id,
          eventType: "AGENT_RESPONSE",
          status: "SUCCESS",
          payloadJson: JSON.stringify({
            summary: `Automated summary for ${correspondence.reference}`,
            suggestedAction: "Assign to action owner and acknowledge sender",
            ownerId: correspondence.actionOwnerId,
            deadline: correspondence.dueDate ?? null,
            confidenceScore: 0.84,
            actionSource: resolveActionSource(actor.id)
          }),
          createdById: actor.id
        });
      }

      const mail = command.mode === "BASIC"
        ? composeBasicMail(correspondence.reference, correspondence.subject)
        : composeExtendedMail(correspondence.reference);

      const notificationOutcome = await dispatchNotification(
        db,
        {
          recipientId,
          subject: mail.subject,
          body: mail.body,
          correspondenceId: correspondence.id
        },
        actor.id,
        command.mode
      );

      if (notificationOutcome === "FAILED") {
        appendAuditEvent(db, {
          correspondenceId: correspondence.id,
          eventType: "WORKFLOW_FAILURE",
          status: "FAILED",
          payloadJson: JSON.stringify({ mode: command.mode, notificationOutcome }),
          errorMessage: "Post-capture notification failed",
          createdById: actor.id
        });
      }

      res.status(200).json({ message: "Workflow execution completed", notificationOutcome });
    } catch (error) {
      console.error("Error executing workflow:", error);

      const command = req.body as ExecutePostCaptureWorkflowCommand | undefined;
      if (command?.correspondence?.id) {
        appendAuditEvent(db, {
          correspondenceId: command.correspondence.id,
          eventType: "WORKFLOW_FAILURE",
          status: "FAILED",
          payloadJson: JSON.stringify({ mode: command.mode ?? "BASIC" }),
          errorMessage: error instanceof Error ? error.message : "Failed to execute workflow",
          createdById: command.actor?.id || "SYSTEM"
        });
      }

      res.status(200).json({
        message: "Workflow execution completed with failure",
        error: error instanceof Error ? error.message : "Failed to execute workflow"
      });
    }
  });
}
