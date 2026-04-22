import type { ICorrespondenceAuditLogRepository } from "../../contracts/ICorrespondenceAuditLogRepository";
import type { INotificationService } from "../../contracts/INotificationService";
import type {
  ExecutePostCaptureWorkflowCommand,
  IPostCaptureWorkflowService
} from "../../contracts/IPostCaptureWorkflowService";

export class SqlitePostCaptureWorkflowService implements IPostCaptureWorkflowService {
  constructor(
    private readonly notifications: INotificationService,
    private readonly auditLog: ICorrespondenceAuditLogRepository
  ) {}

  async execute(command: ExecutePostCaptureWorkflowCommand): Promise<void> {
    const recipientId = this.resolveRecipientId(command);
    const subject = `Correspondence ${command.correspondence.reference} received`;
    const body = [
      "A new correspondence has been captured and assigned.",
      `Reference: ${command.correspondence.reference}`,
      `Subject: ${command.correspondence.subject}`
    ].join("\n");

    await this.notifications.send({
      recipientId,
      subject,
      body,
      correspondenceId: command.correspondence.id
    });

    await this.auditLog.append({
      correspondenceId: command.correspondence.id,
      eventType: "NOTIFICATION_SENT",
      status: "SUCCESS",
      payloadJson: JSON.stringify({ mode: command.mode, recipientId, subject }),
      createdById: command.actor.id
    });
  }

  private resolveRecipientId(command: ExecutePostCaptureWorkflowCommand): string {
    return command.correspondence.recipientId ?? command.correspondence.actionOwnerId ?? command.actor.id;
  }
}
