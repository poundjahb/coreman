import nodemailer from "nodemailer";

export interface SqliteMailMessage {
  to: string;
  subject: string;
  text: string;
}

export interface ISqliteMailer {
  send(message: SqliteMailMessage): Promise<void>;
}

/**
 * Nodemailer-based mailer supporting SMTP configuration.
 * Can be instantiated with individual SMTP parameters or used with legacy SmtpConfig.
 */
export class NodemailerSqliteMailer {
  private readonly transport: nodemailer.Transporter;

  constructor(
    private readonly smtpHost: string,
    private readonly smtpPort: number,
    private readonly smtpSecure: boolean,
    private readonly smtpUser: string | undefined,
    private readonly smtpPass: string | undefined,
    private readonly connectionTimeoutMs: number
  ) {
    this.transport = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: smtpUser && smtpPass
        ? {
          user: smtpUser,
          pass: smtpPass
        }
        : undefined,
      connectionTimeout: connectionTimeoutMs,
      greetingTimeout: connectionTimeoutMs,
      socketTimeout: connectionTimeoutMs
    });
  }

  async sendMail(fromAddress: string, to: string, subject: string, text: string): Promise<void> {
    await this.transport.sendMail({
      from: fromAddress,
      to,
      subject,
      text
    });
  }

  async sendMailWithResult(
    fromAddress: string,
    to: string,
    subject: string,
    text: string
  ): Promise<{ messageId: string }> {
    const info = await this.transport.sendMail({
      from: fromAddress,
      to,
      subject,
      text
    });

    return {
      messageId: info.messageId || "sent"
    };
  }

  async send(message: SqliteMailMessage): Promise<void> {
    throw new Error("Use sendMail() instead of send() for new code");
  }
}
