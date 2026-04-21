import { randomUUID } from "crypto";
export class SqliteNotificationService {
    constructor(db) {
        this.db = db;
    }
    async send(payload) {
        this.db
            .prepare(`INSERT INTO notifications (id, recipientId, subject, body, correspondenceId, sentAt)
         VALUES (@id, @recipientId, @subject, @body, @correspondenceId, @sentAt)`)
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
