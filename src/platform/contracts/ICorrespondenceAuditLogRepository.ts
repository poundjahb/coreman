export type CorrespondenceAuditEventType =
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

export type CorrespondenceAuditEventStatus = "SUCCESS" | "FAILED" | "SKIPPED";

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