import { randomUUID } from "crypto";
import type { Database } from "better-sqlite3";
import type { INotificationService, NotificationPayload } from "../../contracts/INotificationService";
import type { ISmtpSettingsService } from "../../contracts/ISmtpSettingsService";
import { NodemailerSqliteMailer } from "./SqliteMailer";

export class SqliteNotificationService implements INotificationService {
  constructor(
    private readonly db: Database,
    private readonly smtpSettingsService: ISmtpSettingsService
  ) {}

  async send(payload: NotificationPayload): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO notifications (id, recipientId, subject, body, correspondenceId, sentAt)
         VALUES (@id, @recipientId, @subject, @body, @correspondenceId, @sentAt)`
      )
      .run({
        id: randomUUID(),
        recipientId: payload.recipientId,
        subject: payload.subject,
        body: payload.body,
        correspondenceId: payload.correspondenceId ?? null,
        sentAt: new Date().toISOString()
      });

    const row = this.db.prepare("SELECT email FROM users WHERE id = ?").get(payload.recipientId) as
      | { email: string }
      | undefined;
    const recipientEmail = row?.email;

    if (!recipientEmail) {
      return;
    }

    const config = await this.smtpSettingsService.getConfig();
    const mailer = new NodemailerSqliteMailer(config);

    await mailer.send({
      to: recipientEmail,
      subject: payload.subject,
      text: payload.body
    });
  }
}
