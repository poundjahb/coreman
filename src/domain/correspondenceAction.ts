export type CorrespondenceActionCategory = "INFO" | "RESPONSE" | "TASK" | "PROCESS";

export type ActionTriggerMode = "NONE" | "OWNER_EXECUTE";

export type ActionWorkflowMethod = "POST" | "PUT";

export type ActionWorkflowAuthType = "NONE" | "API_KEY" | "BEARER_TOKEN_REF";

export type CorrespondenceTaskAssignmentStatus =
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELED";

export interface CorrespondenceActionDefinition {
  id: string;
  code: string;
  label: string;
  description?: string;
  category: CorrespondenceActionCategory;
  requiresOwner: boolean;
  triggerMode: ActionTriggerMode;
  workflowEnabled: boolean;
  workflowMethod: ActionWorkflowMethod;
  workflowEndpointUrl?: string;
  workflowTimeoutMs: number;
  authType: ActionWorkflowAuthType;
  authSecretRef?: string;
  payloadTemplate?: string;
  retryMaxAttempts: number;
  retryBackoffMs: number;
  defaultSlaDays?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CorrespondenceTaskAssignment {
  id: string;
  correspondenceId: string;
  actionDefinitionId: string;
  description?: string;
  assigneeUserId: string;
  ccUserIds: string[];
  deadline: Date;
  status: CorrespondenceTaskAssignmentStatus;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}
