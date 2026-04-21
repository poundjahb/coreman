import { randomUUID } from "crypto";
import type { Database } from "better-sqlite3";
import type { INotificationService, NotificationPayload } from "../../contracts/INotificationService";

export class SqliteNotificationService implements INotificationService {
  constructor(private readonly db: Database) {}

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
  }
}
