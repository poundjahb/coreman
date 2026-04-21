export interface NotificationPayload {
  recipientId: string;
  subject: string;
  body: string;
  correspondenceId?: string;
}

export interface INotificationService {
  send(payload: NotificationPayload): Promise<void>;
}
