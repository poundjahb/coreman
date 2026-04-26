import type { Database } from "better-sqlite3";
import type { CorrespondenceActionDefinition } from "../../../domain/correspondenceAction";
import type { ICorrespondenceActionDefinitionRepository } from "../../contracts/ICorrespondenceActionDefinitionRepository";

function rowToDefinition(row: Record<string, unknown>): CorrespondenceActionDefinition {
  const defaultDeadlineDays = row["defaultDeadlineDays"] === null
    ? undefined
    : Number(row["defaultDeadlineDays"]);
  const defaultSlaDays = row["defaultSlaDays"] === null
    ? undefined
    : Number(row["defaultSlaDays"]);

  return {
    id: row["id"] as string,
    code: row["code"] as string,
    label: row["label"] as string,
    description: (row["description"] as string | null) ?? undefined,
    category: row["category"] as CorrespondenceActionDefinition["category"],
    requiresOwner: Boolean(row["requiresOwner"]),
    triggerMode: row["triggerMode"] as CorrespondenceActionDefinition["triggerMode"],
    workflowEnabled: Boolean(row["workflowEnabled"]),
    workflowMethod: row["workflowMethod"] as CorrespondenceActionDefinition["workflowMethod"],
    workflowEndpointUrl: (row["workflowEndpointUrl"] as string | null) ?? undefined,
    workflowTimeoutMs: Number(row["workflowTimeoutMs"]),
    authType: row["authType"] as CorrespondenceActionDefinition["authType"],
    authSecretRef: (row["authSecretRef"] as string | null) ?? undefined,
    payloadTemplate: (row["payloadTemplate"] as string | null) ?? undefined,
    retryMaxAttempts: Number(row["retryMaxAttempts"]),
    retryBackoffMs: Number(row["retryBackoffMs"]),
    defaultDeadlineDays: defaultDeadlineDays ?? defaultSlaDays,
    defaultSlaDays,
    isActive: Boolean(row["isActive"]),
    createdAt: new Date(row["createdAt"] as string),
    updatedAt: new Date(row["updatedAt"] as string)
  };
}

export class SqliteCorrespondenceActionDefinitionRepository
  implements ICorrespondenceActionDefinitionRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string): Promise<CorrespondenceActionDefinition | null> {
    const row = this.db
      .prepare("SELECT * FROM correspondence_action_definitions WHERE id = ?")
      .get(id) as Record<string, unknown> | undefined;
    return row ? rowToDefinition(row) : null;
  }

  async findAll(): Promise<CorrespondenceActionDefinition[]> {
    return (
      this.db
        .prepare("SELECT * FROM correspondence_action_definitions ORDER BY code")
        .all() as Record<string, unknown>[]
    ).map(rowToDefinition);
  }

  async findActive(): Promise<CorrespondenceActionDefinition[]> {
    return (
      this.db
        .prepare("SELECT * FROM correspondence_action_definitions WHERE isActive = 1 ORDER BY code")
        .all() as Record<string, unknown>[]
    ).map(rowToDefinition);
  }

  async save(definition: CorrespondenceActionDefinition): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO correspondence_action_definitions (
          id, code, label, description, category, requiresOwner, triggerMode,
          workflowEnabled, workflowMethod, workflowEndpointUrl, workflowTimeoutMs,
          authType, authSecretRef, payloadTemplate, retryMaxAttempts, retryBackoffMs,
          defaultDeadlineDays, defaultSlaDays, isActive, createdAt, updatedAt
        ) VALUES (
          @id, @code, @label, @description, @category, @requiresOwner, @triggerMode,
          @workflowEnabled, @workflowMethod, @workflowEndpointUrl, @workflowTimeoutMs,
          @authType, @authSecretRef, @payloadTemplate, @retryMaxAttempts, @retryBackoffMs,
          @defaultDeadlineDays, @defaultSlaDays, @isActive, @createdAt, @updatedAt
        )
        ON CONFLICT(id) DO UPDATE SET
          code = excluded.code,
          label = excluded.label,
          description = excluded.description,
          category = excluded.category,
          requiresOwner = excluded.requiresOwner,
          triggerMode = excluded.triggerMode,
          workflowEnabled = excluded.workflowEnabled,
          workflowMethod = excluded.workflowMethod,
          workflowEndpointUrl = excluded.workflowEndpointUrl,
          workflowTimeoutMs = excluded.workflowTimeoutMs,
          authType = excluded.authType,
          authSecretRef = excluded.authSecretRef,
          payloadTemplate = excluded.payloadTemplate,
          retryMaxAttempts = excluded.retryMaxAttempts,
          retryBackoffMs = excluded.retryBackoffMs,
            defaultDeadlineDays = excluded.defaultDeadlineDays,
          defaultSlaDays = excluded.defaultSlaDays,
          isActive = excluded.isActive,
          updatedAt = excluded.updatedAt`
      )
      .run({
        ...definition,
        description: definition.description ?? null,
        requiresOwner: definition.requiresOwner ? 1 : 0,
        workflowEnabled: definition.workflowEnabled ? 1 : 0,
        workflowEndpointUrl: definition.workflowEndpointUrl ?? null,
        authSecretRef: definition.authSecretRef ?? null,
        payloadTemplate: definition.payloadTemplate ?? null,
        defaultDeadlineDays: definition.defaultDeadlineDays ?? definition.defaultSlaDays ?? null,
        defaultSlaDays: definition.defaultSlaDays ?? definition.defaultDeadlineDays ?? null,
        isActive: definition.isActive ? 1 : 0,
        createdAt: definition.createdAt.toISOString(),
        updatedAt: definition.updatedAt.toISOString()
      });
  }

  async delete(id: string): Promise<void> {
    this.db.prepare("DELETE FROM correspondence_action_definitions WHERE id = ?").run(id);
  }
}
