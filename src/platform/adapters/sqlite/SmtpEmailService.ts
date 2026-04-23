/**
 * SMTP email backend implementation using nodemailer
 * Persists config to database for SQLite and SERVER modes
 */
import type { Database } from "better-sqlite3";
import type {
  IEmailService,
  SendTestEmailCommand,
  SendEmailResult,
  EmailConfig
} from "../../contracts/IEmailService";
import { NodemailerSqliteMailer } from "./SqliteMailer";

type EmailSettingsRow = {
  id: string;
  backendType: string;
  config: string; // JSON
  fromAddress: string;
  updatedAt: string;
};

function rowToConfig(row: EmailSettingsRow): EmailConfig {
  const parsed = JSON.parse(row.config);
  return {
    backendType: row.backendType as any,
    fromAddress: row.fromAddress,
    connectionTimeoutMs: parsed.connectionTimeoutMs,
    updatedAt: row.updatedAt,
    smtpHost: parsed.smtpHost,
    smtpPort: parsed.smtpPort,
    smtpSecure: parsed.smtpSecure,
    smtpUser: parsed.smtpUser,
    smtpPass: parsed.smtpPass
  };
}

export class SmtpEmailService implements IEmailService {
  constructor(private readonly db: Database) {}

  async getConfig(): Promise<EmailConfig> {
    const row = this.db
      .prepare(`SELECT id, backendType, config, fromAddress, updatedAt FROM email_settings WHERE id = 1`)
      .get() as EmailSettingsRow | undefined;

    if (!row || row.backendType !== "SMTP") {
      throw new Error("SMTP settings are not configured. Save configuration before using SMTP operations.");
    }

    return rowToConfig(row);
  }

  async saveConfig(config: EmailConfig): Promise<void> {
    const smtpConfig = {
      smtpHost: config.smtpHost,
      smtpPort: config.smtpPort,
      smtpSecure: config.smtpSecure,
      smtpUser: config.smtpUser,
      smtpPass: config.smtpPass,
      connectionTimeoutMs: config.connectionTimeoutMs
    };

    this.db
      .prepare(
        `INSERT INTO email_settings
          (id, backendType, config, fromAddress, updatedAt)
         VALUES
          (1, @backendType, @config, @fromAddress, @updatedAt)
         ON CONFLICT(id)
         DO UPDATE SET
           backendType = excluded.backendType,
           config = excluded.config,
           fromAddress = excluded.fromAddress,
           updatedAt = excluded.updatedAt`
      )
      .run({
        backendType: "SMTP",
        config: JSON.stringify(smtpConfig),
        fromAddress: config.fromAddress,
        updatedAt: new Date().toISOString()
      });
  }

  async sendTestEmail(command: SendTestEmailCommand): Promise<void> {
    const config = await this.getConfig();

    const subject = command.subject ?? "SMTP Test Email";
    const body = command.body ?? "SMTP configuration test completed successfully.";

    const mailer = new NodemailerSqliteMailer(
      config.smtpHost!,
      config.smtpPort!,
      config.smtpSecure!,
      config.smtpUser,
      config.smtpPass,
      config.connectionTimeoutMs
    );

    await mailer.sendMail(config.fromAddress, command.to, subject, body);
  }

  async sendEmail(command: {
    to: string;
    subject: string;
    body: string;
  }): Promise<SendEmailResult> {
    try {
      const config = await this.getConfig();

      const mailer = new NodemailerSqliteMailer(
        config.smtpHost!,
        config.smtpPort!,
        config.smtpSecure!,
        config.smtpUser,
        config.smtpPass,
        config.connectionTimeoutMs
      );

      const result = await mailer.sendMailWithResult(
        config.fromAddress,
        command.to,
        command.subject,
        command.body
      );

      return {
        success: true,
        messageId: result.messageId
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to send email"
      };
    }
  }
}
