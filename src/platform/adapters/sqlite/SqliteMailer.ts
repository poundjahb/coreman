import nodemailer from "nodemailer";
import type { SmtpConfig } from "../../../config/systemConfig";

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
  private readonly defaultFromAddress?: string;

  constructor(
    config: SmtpConfig
  );
  constructor(
    smtpHost: string,
    smtpPort: number,
    smtpSecure: boolean,
    smtpUser: string | undefined,
    smtpPass: string | undefined,
    connectionTimeoutMs: number
  );
  constructor(
    arg1: SmtpConfig | string,
    arg2?: number,
    arg3?: boolean,
    arg4?: string | undefined,
    arg5?: string | undefined,
    arg6?: number
  ) {
    const resolved: SmtpConfig =
      typeof arg1 === "string"
        ? {
          host: arg1,
          port: arg2 ?? 25,
          secure: arg3 ?? false,
          user: arg4,
          pass: arg5,
          fromAddress: "",
          connectionTimeoutMs: arg6 ?? 5000
        }
        : arg1;

    this.defaultFromAddress = resolved.fromAddress;
    this.transport = nodemailer.createTransport({
      host: resolved.host,
      port: resolved.port,
      secure: resolved.secure,
      auth: resolved.user && resolved.pass
        ? {
          user: resolved.user,
          pass: resolved.pass
        }
        : undefined,
      connectionTimeout: resolved.connectionTimeoutMs,
      greetingTimeout: resolved.connectionTimeoutMs,
      socketTimeout: resolved.connectionTimeoutMs
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
    if (!this.defaultFromAddress) {
      throw new Error("From address is required when using send(). Use sendMail() or provide SmtpConfig with fromAddress.");
    }

    await this.sendMail(this.defaultFromAddress, message.to, message.subject, message.text);
  }
}
