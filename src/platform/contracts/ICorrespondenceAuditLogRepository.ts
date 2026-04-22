export type CorrespondenceAuditEventType =
  | "AGENT_CALL"
  | "AGENT_RESPONSE"
  | "NOTIFICATION_SENT"
  | "WORKFLOW_FAILURE"
  | "POWERFLOW_CALL"
  | "POWERFLOW_RESPONSE";

export type CorrespondenceAuditEventStatus = "SUCCESS" | "FAILED";

export interface CorrespondenceAuditEvent {
  id: string;
  correspondenceId: string;
  eventType: CorrespondenceAuditEventType;
  status: CorrespondenceAuditEventStatus;
  payloadJson?: string;
  errorMessage?: string;
  createdAt: Date;
  createdById: string;
}

export interface CreateCorrespondenceAuditEvent {
  correspondenceId: string;
  eventType: CorrespondenceAuditEventType;
  status: CorrespondenceAuditEventStatus;
  payloadJson?: string;
  errorMessage?: string;
  createdById: string;
}

export interface ICorrespondenceAuditLogRepository {
  append(event: CreateCorrespondenceAuditEvent): Promise<CorrespondenceAuditEvent>;
  findByCorrespondence(correspondenceId: string): Promise<CorrespondenceAuditEvent[]>;
}