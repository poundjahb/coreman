import type { SmtpConfig } from "../../../config/systemConfig";
import type { Correspondence } from "../../../domain/correspondence";
import type { CorrespondenceActionDefinition, CorrespondenceTaskAssignment } from "../../../domain/correspondenceAction";
import type { Branch, Department, AppUser } from "../../../domain/governance";
import type { ReferenceFormatConfig } from "../../../domain/reference";
import type { IHostAdapter } from "../../IHostAdapter";
import type {
  CorrespondenceAuditEvent,
  CreateCorrespondenceAuditEvent
} from "../../contracts/ICorrespondenceAuditLogRepository";
import type {
  ExecutePostCaptureWorkflowCommand
} from "../../contracts/IPostCaptureWorkflowService";
import type { NotificationPayload } from "../../contracts/INotificationService";
import type { SendTestEmailCommand } from "../../contracts/ISmtpSettingsService";
import type { EmailConfig, SendTestEmailCommand as SendTestEmailCommand2 } from "../../contracts/IEmailService";
import type { SaveWorkflowBindingCommand } from "../../contracts/IWorkflowPluginService";
import type { DateManagementThresholds } from "../../../domain/dateManagement";
import type {
  WorkflowBindingRecord,
  WorkflowCatalogSnapshot,
  WorkflowPluginRecord,
  WorkflowPluginRefreshResult
} from "../../../domain/workflowPlugin";
import { buildPlatformIndicator } from "../../platformIndicator";

export const serverPlatformIndicator = buildPlatformIndicator({
  target: "SERVER",
  label: "Server API",
  initials: "SV",
  backgroundColor: "#2f8f58"
});

interface HttpHostAdapterOptions {
  apiBaseUrl?: string;
}

interface SequenceNextResponse {
  value: number;
}

function getApiBaseUrl(options: HttpHostAdapterOptions): string {
  if (options.apiBaseUrl) {
    return options.apiBaseUrl.replace(/\/$/, "");
  }

  if (typeof import.meta !== "undefined") {
    const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
    const fromEnv = env?.VITE_API_BASE_URL;
    if (typeof fromEnv === "string" && fromEnv.length > 0) {
      return fromEnv.replace(/\/$/, "");
    }
  }

  return "http://localhost:3001";
}

function serializeQuery(query?: Record<string, string | undefined>): string {
  if (!query) {
    return "";
  }

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (typeof value === "string" && value.length > 0) {
      params.set(key, value);
    }
  }

  const raw = params.toString();
  return raw.length > 0 ? `?${raw}` : "";
}

function resolveUserId(user: AppUser | string | undefined): string | undefined {
  if (!user) {
    return undefined;
  }

  if (typeof user === "string") {
    return user;
  }

  return user.id;
}

function hydrateCorrespondence(raw: Correspondence): Correspondence {
  const createBy = (raw as Correspondence & { createBy?: AppUser | string }).createBy;
  const registeredById = (raw as Correspondence & { registeredById?: string }).registeredById
    ?? resolveUserId(createBy)
    ?? "";

  return {
    ...raw,
    registeredById,
    correspondenceDate: raw.correspondenceDate ? new Date(raw.correspondenceDate) : undefined,
    receivedDate: new Date(raw.receivedDate),
    dueDate: raw.dueDate ? new Date(raw.dueDate) : undefined,
    attachmentUploadedAt: raw.attachmentUploadedAt ? new Date(raw.attachmentUploadedAt) : undefined,
    createdAt: new Date(raw.createdAt),
    updatedAt: new Date(raw.updatedAt),
    createBy: raw.createBy,
    updateBy: raw.updateBy
  };
}

function hydrateActionDefinition(raw: CorrespondenceActionDefinition): CorrespondenceActionDefinition {
  return {
    ...raw,
    createdAt: new Date(raw.createdAt),
    updatedAt: new Date(raw.updatedAt)
  };
}

function hydrateTaskAssignment(raw: CorrespondenceTaskAssignment): CorrespondenceTaskAssignment {
  return {
    ...raw,
    deadline: new Date(raw.deadline),
    executionComment: raw.executionComment ?? undefined,
    closedAt: raw.closedAt ? new Date(raw.closedAt) : undefined,
    closedBy: raw.closedBy ?? undefined,
    createdAt: new Date(raw.createdAt),
    updatedAt: new Date(raw.updatedAt)
  };
}

function hydrateAuditEvent(raw: CorrespondenceAuditEvent): CorrespondenceAuditEvent {
  return {
    ...raw,
    createdAt: new Date(raw.createdAt)
  };
}

function hydrateWorkflowPlugin(raw: WorkflowPluginRecord): WorkflowPluginRecord {
  return {
    ...raw,
    discoveredAt: new Date(raw.discoveredAt),
    updatedAt: new Date(raw.updatedAt)
  };
}

function hydrateWorkflowBinding(raw: WorkflowBindingRecord): WorkflowBindingRecord {
  return {
    ...raw,
    createdAt: new Date(raw.createdAt),
    updatedAt: new Date(raw.updatedAt)
  };
}

function hydrateWorkflowCatalog(raw: WorkflowCatalogSnapshot): WorkflowCatalogSnapshot {
  return {
    ...raw,
    plugins: raw.plugins.map(hydrateWorkflowPlugin),
    bindings: raw.bindings.map(hydrateWorkflowBinding)
  };
}

async function requestJson<TResponse>(
  baseUrl: string,
  path: string,
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  body?: unknown,
  query?: Record<string, string | undefined>
): Promise<TResponse> {
  const response = await fetch(`${baseUrl}${path}${serializeQuery(query)}`, {
    method,
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "include",
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Server API request failed (${response.status}): ${errorText}`);
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return (await response.json()) as TResponse;
}

async function requestFormData<TResponse>(
  baseUrl: string,
  path: string,
  method: "POST" | "PUT" | "PATCH",
  body: FormData,
  query?: Record<string, string | undefined>
): Promise<TResponse> {
  const response = await fetch(`${baseUrl}${path}${serializeQuery(query)}`, {
    method,
    credentials: "include",
    body
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Server API request failed (${response.status}): ${errorText}`);
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return (await response.json()) as TResponse;
}

export function createHttpHostAdapter(options: HttpHostAdapterOptions = {}): IHostAdapter {
  const apiBaseUrl = getApiBaseUrl(options);

  return {
    platform: serverPlatformIndicator,
    correspondences: {
      async findById(id: string): Promise<Correspondence | null> {
        const payload = await requestJson<Correspondence | null>(apiBaseUrl, `/api/correspondences/${id}`, "GET");
        return payload ? hydrateCorrespondence(payload) : null;
      },
      async findAll(): Promise<Correspondence[]> {
        const payload = await requestJson<Correspondence[]>(apiBaseUrl, "/api/correspondences", "GET");
        return payload.map(hydrateCorrespondence);
      },
      async findByBranch(branchId: string): Promise<Correspondence[]> {
        const payload = await requestJson<Correspondence[]>(apiBaseUrl, "/api/correspondences", "GET", undefined, { branchId });
        return payload.map(hydrateCorrespondence);
      },
      async save(correspondence: Correspondence): Promise<void> {
        await requestJson<void>(apiBaseUrl, "/api/correspondences", "POST", correspondence);
      },
      async saveWithAttachment(correspondence: Correspondence, attachment: File): Promise<void> {
        const formData = new FormData();
        formData.append("payload", JSON.stringify(correspondence));
        formData.append("attachment", attachment, attachment.name);
        await requestFormData<void>(apiBaseUrl, "/api/correspondences", "POST", formData);
      },
      async update(id: string, changes: Partial<Omit<Correspondence, "id">>): Promise<void> {
        await requestJson<void>(apiBaseUrl, `/api/correspondences/${id}`, "PATCH", changes);
      }
    },
    users: {
      findById: (id: string): Promise<AppUser | null> => requestJson<AppUser | null>(apiBaseUrl, `/api/users/${id}`, "GET"),
      findAll: (): Promise<AppUser[]> => requestJson<AppUser[]>(apiBaseUrl, "/api/users", "GET"),
      findByBranch: (branchId: string): Promise<AppUser[]> =>
        requestJson<AppUser[]>(apiBaseUrl, "/api/users", "GET", undefined, { branchId }),
      save: (user: AppUser): Promise<void> => requestJson<void>(apiBaseUrl, "/api/users", "POST", user),
      delete: (id: string): Promise<void> => requestJson<void>(apiBaseUrl, `/api/users/${id}`, "DELETE")
    },
    branches: {
      findById: (id: string): Promise<Branch | null> => requestJson<Branch | null>(apiBaseUrl, `/api/branches/${id}`, "GET"),
      findAll: (): Promise<Branch[]> => requestJson<Branch[]>(apiBaseUrl, "/api/branches", "GET"),
      save: (branch: Branch): Promise<void> => requestJson<void>(apiBaseUrl, "/api/branches", "POST", branch),
      delete: (id: string): Promise<void> => requestJson<void>(apiBaseUrl, `/api/branches/${id}`, "DELETE")
    },
    departments: {
      findById: (id: string): Promise<Department | null> =>
        requestJson<Department | null>(apiBaseUrl, `/api/departments/${id}`, "GET"),
      findAll: (): Promise<Department[]> => requestJson<Department[]>(apiBaseUrl, "/api/departments", "GET"),
      save: (department: Department): Promise<void> => requestJson<void>(apiBaseUrl, "/api/departments", "POST", department),
      delete: (id: string): Promise<void> => requestJson<void>(apiBaseUrl, `/api/departments/${id}`, "DELETE")
    },
    actionDefinitions: {
      async findById(id: string): Promise<CorrespondenceActionDefinition | null> {
        const payload = await requestJson<CorrespondenceActionDefinition | null>(
          apiBaseUrl,
          `/api/action-definitions/${id}`,
          "GET"
        );
        return payload ? hydrateActionDefinition(payload) : null;
      },
      async findAll(): Promise<CorrespondenceActionDefinition[]> {
        const payload = await requestJson<CorrespondenceActionDefinition[]>(apiBaseUrl, "/api/action-definitions", "GET");
        return payload.map(hydrateActionDefinition);
      },
      async findActive(): Promise<CorrespondenceActionDefinition[]> {
        const payload = await requestJson<CorrespondenceActionDefinition[]>(
          apiBaseUrl,
          "/api/action-definitions/active",
          "GET"
        );
        return payload.map(hydrateActionDefinition);
      },
      save: (definition: CorrespondenceActionDefinition): Promise<void> =>
        requestJson<void>(apiBaseUrl, "/api/action-definitions", "POST", definition),
      delete: (id: string): Promise<void> => requestJson<void>(apiBaseUrl, `/api/action-definitions/${id}`, "DELETE")
    },
    taskAssignments: {
      async findById(id: string): Promise<CorrespondenceTaskAssignment | null> {
        const payload = await requestJson<CorrespondenceTaskAssignment | null>(apiBaseUrl, `/api/assignments/${id}`, "GET");
        return payload ? hydrateTaskAssignment(payload) : null;
      },
      async findByCorrespondence(correspondenceId: string): Promise<CorrespondenceTaskAssignment[]> {
        const payload = await requestJson<CorrespondenceTaskAssignment[]>(
          apiBaseUrl,
          `/api/correspondences/${correspondenceId}/assignments`,
          "GET"
        );
        return payload.map(hydrateTaskAssignment);
      },
      async findByAssignee(assigneeUserId: string): Promise<CorrespondenceTaskAssignment[]> {
        const payload = await requestJson<CorrespondenceTaskAssignment[]>(
          apiBaseUrl,
          "/api/assignments",
          "GET",
          undefined,
          { assigneeUserId }
        );
        return payload.map(hydrateTaskAssignment);
      },
      async save(assignment: CorrespondenceTaskAssignment): Promise<void> {
        await requestJson<void>(
          apiBaseUrl,
          `/api/correspondences/${assignment.correspondenceId}/assignments`,
          "POST",
          assignment
        );
      },
      async update(
        id: string,
        changes: Partial<Omit<CorrespondenceTaskAssignment, "id" | "createdAt" | "createdBy">>
      ): Promise<void> {
        await requestJson<void>(apiBaseUrl, `/api/assignments/${id}`, "PATCH", changes);
      }
    },
    referenceConfigs: {
      findAll: (): Promise<ReferenceFormatConfig[]> =>
        requestJson<ReferenceFormatConfig[]>(apiBaseUrl, "/api/reference-configs", "GET"),
      findActive: (): Promise<ReferenceFormatConfig[]> =>
        requestJson<ReferenceFormatConfig[]>(apiBaseUrl, "/api/reference-configs/active", "GET")
    },
    smtpSettings: {
      getConfig: (): Promise<SmtpConfig> => requestJson<SmtpConfig>(apiBaseUrl, "/api/smtp-settings", "GET"),
      saveConfig: (config: SmtpConfig): Promise<void> => requestJson<void>(apiBaseUrl, "/api/smtp-settings", "PUT", config),
      sendTestEmail: (command: SendTestEmailCommand): Promise<void> =>
        requestJson<void>(apiBaseUrl, "/api/smtp-settings/test", "POST", command)
    },
    emailSettings: {
      getConfig: (): Promise<EmailConfig> => requestJson<EmailConfig>(apiBaseUrl, "/api/email-settings", "GET"),
      saveConfig: (config: EmailConfig): Promise<void> => requestJson<void>(apiBaseUrl, "/api/email-settings", "PUT", config),
      sendTestEmail: (command: SendTestEmailCommand2): Promise<void> =>
        requestJson<void>(apiBaseUrl, "/api/email-settings/test", "POST", command),
      sendEmail: (command: { to: string; subject: string; body: string }): Promise<any> =>
        requestJson<any>(apiBaseUrl, "/api/email-settings/send", "POST", command)
    },
    notifications: {
      send: (payload: NotificationPayload): Promise<void> => requestJson<void>(apiBaseUrl, "/api/notifications", "POST", payload)
    },
    correspondenceAuditLog: {
      append: async (event: CreateCorrespondenceAuditEvent): Promise<CorrespondenceAuditEvent> => {
        const payload = await requestJson<CorrespondenceAuditEvent>(apiBaseUrl, "/api/correspondence-audit-log", "POST", event);
        return hydrateAuditEvent(payload);
      },
      findByCorrespondence: async (correspondenceId: string): Promise<CorrespondenceAuditEvent[]> => {
        const payload = await requestJson<CorrespondenceAuditEvent[]>(
          apiBaseUrl,
          "/api/correspondence-audit-log",
          "GET",
          undefined,
          { correspondenceId }
        );
        return payload.map(hydrateAuditEvent);
      }
    },
    workflowPlugins: {
      async getCatalog(): Promise<WorkflowCatalogSnapshot> {
        const payload = await requestJson<WorkflowCatalogSnapshot>(apiBaseUrl, "/api/workflow-catalog", "GET");
        return hydrateWorkflowCatalog(payload);
      },
      async listPlugins(): Promise<WorkflowPluginRecord[]> {
        const payload = await requestJson<WorkflowPluginRecord[]>(apiBaseUrl, "/api/workflow-plugins", "GET");
        return payload.map(hydrateWorkflowPlugin);
      },
      refresh: (): Promise<WorkflowPluginRefreshResult> =>
        requestJson<WorkflowPluginRefreshResult>(apiBaseUrl, "/api/workflow-plugins/refresh", "POST"),
      setPluginEnabled: (pluginKey: string, isEnabled: boolean): Promise<void> =>
        requestJson<void>(apiBaseUrl, `/api/workflow-plugins/${encodeURIComponent(pluginKey)}/enabled`, "PATCH", { isEnabled }),
      async listBindings(): Promise<WorkflowBindingRecord[]> {
        const payload = await requestJson<WorkflowBindingRecord[]>(apiBaseUrl, "/api/workflow-bindings", "GET");
        return payload.map(hydrateWorkflowBinding);
      },
      async saveBinding(command: SaveWorkflowBindingCommand): Promise<WorkflowBindingRecord> {
        if (command.id) {
          const payload = await requestJson<WorkflowBindingRecord>(
            apiBaseUrl,
            `/api/workflow-bindings/${encodeURIComponent(command.id)}`,
            "PATCH",
            command
          );
          return hydrateWorkflowBinding(payload);
        }

        const payload = await requestJson<WorkflowBindingRecord>(apiBaseUrl, "/api/workflow-bindings", "POST", command);
        return hydrateWorkflowBinding(payload);
      },
      deleteBinding: (id: string): Promise<void> =>
        requestJson<void>(apiBaseUrl, `/api/workflow-bindings/${encodeURIComponent(id)}`, "DELETE")
    },
    dateManagement: {
      getThresholds: (): Promise<DateManagementThresholds> =>
        requestJson<DateManagementThresholds>(apiBaseUrl, "/api/date-management-settings", "GET"),
      saveThresholds: (thresholds: DateManagementThresholds): Promise<void> =>
        requestJson<void>(apiBaseUrl, "/api/date-management-settings", "PUT", thresholds)
    },
    postCaptureWorkflow: {
      execute: (command: ExecutePostCaptureWorkflowCommand): Promise<void> =>
        requestJson<void>(apiBaseUrl, "/api/post-capture-workflow/execute", "POST", command)
    },
    sequenceStore: {
      async next(key: string): Promise<number> {
        const payload = await requestJson<SequenceNextResponse>(apiBaseUrl, "/api/sequences/next", "POST", { key });
        return payload.value;
      }
    }
  };
}
