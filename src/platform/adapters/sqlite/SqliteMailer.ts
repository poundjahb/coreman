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

export class NodemailerSqliteMailer implements ISqliteMailer {
  private readonly transport: nodemailer.Transporter;

  constructor(private readonly config: SmtpConfig) {
    this.transport = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.user && config.pass
        ? {
          user: config.user,
          pass: config.pass
        }
        : undefined,
      connectionTimeout: config.connectionTimeoutMs,
      greetingTimeout: config.connectionTimeoutMs,
      socketTimeout: config.connectionTimeoutMs
    });
  }

  async send(message: SqliteMailMessage): Promise<void> {
    await this.transport.sendMail({
      from: this.config.fromAddress,
      to: message.to,
      subject: message.subject,
      text: message.text
    });
  }
}
