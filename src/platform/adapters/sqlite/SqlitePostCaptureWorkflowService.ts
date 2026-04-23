import type { ICorrespondenceAuditLogRepository } from "../../contracts/ICorrespondenceAuditLogRepository";
import type { INotificationService } from "../../contracts/INotificationService";
import type {
  ExecutePostCaptureWorkflowCommand,
  IPostCaptureWorkflowService
} from "../../contracts/IPostCaptureWorkflowService";

interface SimulatedAgentResponse {
  summary: string;
  suggestedAction: string;
  ownerId?: string;
  deadline: string;
  confidenceScore: number;
  mail: {
    subject: string;
    body: string;
  };
}

export class SqlitePostCaptureWorkflowService implements IPostCaptureWorkflowService {
  constructor(
    private readonly notifications: INotificationService,
    private readonly auditLog: ICorrespondenceAuditLogRepository
  ) {}

  async execute(command: ExecutePostCaptureWorkflowCommand): Promise<void> {
    if (command.mode === "BASIC") {
      await this.executeBasic(command);
      return;
    }

    await this.executeExtended(command);
  }

  private async executeBasic(command: ExecutePostCaptureWorkflowCommand): Promise<void> {
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

  private async executeExtended(command: ExecutePostCaptureWorkflowCommand): Promise<void> {
    await this.auditLog.append({
      correspondenceId: command.correspondence.id,
      eventType: "AGENT_CALL",
      status: "SUCCESS",
      payloadJson: JSON.stringify({
        reference: command.correspondence.reference,
        metadata: command.context?.metadata ?? {},
        hasDigitalContent: Boolean(command.context?.digitalContent)
      }),
      createdById: command.actor.id
    });

    const simulatedResponse = this.buildSimulatedAgentResponse(command);
    await this.auditLog.append({
      correspondenceId: command.correspondence.id,
      eventType: "AGENT_RESPONSE",
      status: "SUCCESS",
      payloadJson: JSON.stringify(simulatedResponse),
      createdById: command.actor.id
    });

    const recipientId = this.resolveRecipientId(command);
    await this.notifications.send({
      recipientId,
      subject: simulatedResponse.mail.subject,
      body: simulatedResponse.mail.body,
      correspondenceId: command.correspondence.id
    });

    await this.auditLog.append({
      correspondenceId: command.correspondence.id,
      eventType: "NOTIFICATION_SENT",
      status: "SUCCESS",
      payloadJson: JSON.stringify({ mode: "EXTENDED", recipientId, subject: simulatedResponse.mail.subject }),
      createdById: command.actor.id
    });
  }

  private resolveRecipientId(command: ExecutePostCaptureWorkflowCommand): string {
    return command.correspondence.recipientId ?? command.correspondence.actionOwnerId ?? command.actor.id;
  }

  private buildSimulatedAgentResponse(command: ExecutePostCaptureWorkflowCommand): SimulatedAgentResponse {
    return {
      summary: `Automated summary for ${command.correspondence.reference}`,
      suggestedAction: "Assign to action owner and acknowledge sender",
      ownerId: command.correspondence.actionOwnerId,
      deadline: command.correspondence.dueDate?.toISOString() ?? new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString(),
      confidenceScore: 0.84,
      mail: {
        subject: `Action required: ${command.correspondence.reference}`,
        body: [
          "The correspondence has been analyzed by the simulated agent.",
          `Summary: Automated summary for ${command.correspondence.reference}`,
          "Suggested action: Assign to action owner and acknowledge sender"
        ].join("\n")
      }
    };
  }
}
