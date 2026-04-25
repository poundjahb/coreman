import type Database from "better-sqlite3";
import nodemailer from "nodemailer";
import { randomUUID } from "crypto";
import { clearWorkflowModuleCache, loadWorkflowModule } from "./loader.js";
import {
  normalizeWorkflowPluginRow,
  readWorkflowConfig,
  resolveWorkflowBinding,
  type WorkflowExecutionRequest,
  type WorkflowExecutionResult
} from "./types.js";

type NotificationPayload = {
  recipientId: string;
  subject: string;
  body: string;
  correspondenceId?: string;
};

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

export async function executeWorkflowTrigger(
  db: Database.Database,
  request: WorkflowExecutionRequest
): Promise<WorkflowExecutionResult> {
  const binding = resolveWorkflowBinding(db, {
    actionDefinitionId: request.actionDefinitionId,
    eventCode: request.eventCode
  });

  if (!binding) {
    return { status: "SKIPPED", message: "No active workflow binding found." };
  }

  const pluginRow = db.prepare("SELECT * FROM workflow_plugins WHERE pluginKey = ?").get(binding.pluginKey) as Record<string, unknown> | undefined;
  if (!pluginRow) {
    return { status: "FAILED", pluginKey: binding.pluginKey, message: "Bound workflow plugin could not be found." };
  }

  const plugin = normalizeWorkflowPluginRow(pluginRow);
  if (!plugin.isEnabled || !plugin.isValid) {
    return { status: "SKIPPED", pluginKey: plugin.pluginKey, message: "Bound workflow plugin is disabled or invalid." };
  }

  const module = await loadWorkflowModule(plugin);
  const config = readWorkflowConfig();
  const triggerType = binding.bindingType;
  const triggerCode = triggerType === "ACTION"
    ? binding.actionDefinitionId ?? request.actionDefinitionId ?? binding.pluginKey
    : binding.triggerCode ?? request.eventCode ?? binding.pluginKey;

  appendAuditEvent(db, {
    correspondenceId: request.correspondenceId,
    eventType: "AGENT_CALL",
    status: "SUCCESS",
    payloadJson: JSON.stringify({
      pluginKey: plugin.pluginKey,
      triggerType,
      triggerCode,
      actionDefinitionId: request.actionDefinitionId ?? null,
      eventCode: request.eventCode ?? null,
      context: request.context ?? {}
    }),
    createdById: request.actorId
  });

  try {
    const execution = module.execute({
      trigger: {
        type: triggerType,
        code: triggerCode,
        eventCode: request.eventCode,
        actionDefinitionId: request.actionDefinitionId
      },
      correspondenceId: request.correspondenceId,
      actorId: request.actorId,
      mode: request.mode,
      context: request.context ?? {},
      resources: {
        audit: {
          append: ({ eventType, status = "SUCCESS", payload, errorMessage }) => {
            appendAuditEvent(db, {
              correspondenceId: request.correspondenceId,
              eventType,
              status: status === "FAILED" ? "FAILED" : status === "SKIPPED" ? "SKIPPED" : "SUCCESS",
              payloadJson: payload ? JSON.stringify(payload) : undefined,
              errorMessage,
              createdById: request.actorId
            });
          }
        },
        notifications: {
          send: async (payload: NotificationPayload) => {
            await dispatchNotification(db, payload, request.actorId, request.mode === "EXTENDED" ? "EXTENDED" : "BASIC");
          }
        },
        correspondences: {
          find: (id: string) => getRow(db, "SELECT * FROM correspondences WHERE id = ?", id),
          updateSummary: (id: string, summary: string) => {
            db.prepare(
              `UPDATE correspondences
               SET summary = ?, updatedAt = ?, updateBy = ?
               WHERE id = ?`
            ).run(summary, new Date().toISOString(), request.actorId, id);
          }
        },
        users: {
          find: (id: string) => getRow(db, "SELECT * FROM users WHERE id = ?", id)
        },
        actionDefinitions: {
          find: (id: string) => getRow(db, "SELECT * FROM action_definitions WHERE id = ?", id),
          listActive: () =>
            db.prepare("SELECT * FROM action_definitions WHERE isActive = 1 ORDER BY label COLLATE NOCASE ASC, code ASC")
              .all() as Array<Record<string, unknown>>
        },
        config: {
          get: (key: string) => process.env[key]
        }
      }
    });

    const output = await withTimeout(execution, config.pluginTimeoutMs, `Workflow plugin ${plugin.pluginKey} timed out.`);
    appendAuditEvent(db, {
      correspondenceId: request.correspondenceId,
      eventType: "AGENT_RESPONSE",
      status: "SUCCESS",
      payloadJson: JSON.stringify({
        pluginKey: plugin.pluginKey,
        triggerType,
        triggerCode,
        output: output ?? null
      }),
      createdById: request.actorId
    });
    return {
      pluginKey: plugin.pluginKey,
      status: "SUCCESS",
      output: isRecord(output) ? output : undefined
    };
  } catch (error) {
    appendAuditEvent(db, {
      correspondenceId: request.correspondenceId,
      eventType: "WORKFLOW_FAILURE",
      status: "FAILED",
      payloadJson: JSON.stringify({
        pluginKey: plugin.pluginKey,
        triggerType,
        triggerCode,
        actionDefinitionId: request.actionDefinitionId ?? null,
        eventCode: request.eventCode ?? null
      }),
      errorMessage: error instanceof Error ? error.message : "Workflow plugin execution failed.",
      createdById: request.actorId
    });
    return {
      pluginKey: plugin.pluginKey,
      status: "FAILED",
      message: error instanceof Error ? error.message : "Workflow plugin execution failed."
    };
  }
}

export function clearWorkflowRuntime(): void {
  clearWorkflowModuleCache();
}

function appendAuditEvent(
  db: Database.Database,
  input: {
    correspondenceId: string;
    eventType: string;
    status: "SUCCESS" | "FAILED" | "SKIPPED";
    payloadJson?: string;
    errorMessage?: string;
    createdById: string;
  }
): void {
  const createdAt = new Date().toISOString();
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

async function dispatchNotification(
  db: Database.Database,
  payload: NotificationPayload,
  createdById: string,
  mode: "BASIC" | "EXTENDED"
): Promise<void> {
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

  if (!recipientEmail) {
    return;
  }

  const config = getStoredEmailConfig(db);
  if (!config) {
    throw new Error("Email settings are not configured.");
  }

  await sendEmailUsingConfiguredBackend(config, recipientEmail, payload.subject, payload.body);
  if (payload.correspondenceId) {
    appendAuditEvent(db, {
      correspondenceId: payload.correspondenceId,
      eventType: "NOTIFICATION_SENT",
      status: "SUCCESS",
      payloadJson: JSON.stringify({
        mode,
        recipientId: payload.recipientId,
        recipientEmail,
        subject: payload.subject
      }),
      createdById
    });
  }
}

function getStoredEmailConfig(db: Database.Database): EmailConfig | null {
  const row = db
    .prepare("SELECT backendType, config, fromAddress FROM email_settings WHERE id = 1")
    .get() as EmailSettingsRow | undefined;

  if (!row) {
    return null;
  }

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
      throw new Error("Graph Mail API access token not available.");
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
          toRecipients: [{ emailAddress: { address: to.trim() } }]
        },
        saveToSentItems: true
      })
    });

    if (!response.ok) {
      throw new Error(`Graph Mail API error: ${response.statusText}`);
    }

    return undefined;
  }

  if (!config.resendApiKey) {
    throw new Error("Resend API key not available.");
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
    throw new Error(`Resend API error: ${response.statusText}`);
  }

  const payload = await response.json() as { id?: string };
  return payload.id;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return await Promise.race([
    promise,
    new Promise<T>((_resolve, reject) => {
      const timer = setTimeout(() => {
        clearTimeout(timer);
        reject(new Error(message));
      }, timeoutMs);
    })
  ]);
}

function getRow(db: Database.Database, sql: string, value: string): Record<string, unknown> | null {
  return (db.prepare(sql).get(value) as Record<string, unknown> | undefined) ?? null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}