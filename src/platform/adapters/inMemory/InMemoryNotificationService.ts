import type { INotificationService, NotificationPayload } from "../../contracts/INotificationService";

export class InMemoryNotificationService implements INotificationService {
  readonly sent: NotificationPayload[] = [];

  async send(payload: NotificationPayload): Promise<void> {
    this.sent.push(payload);
  }
}
