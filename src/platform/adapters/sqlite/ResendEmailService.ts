/**
 * Resend email backend implementation
 * Modern, simple email API requiring only an API key
 * https://resend.com/docs/send-email
 */
import type { Database } from "better-sqlite3";
import type {
  IEmailService,
  SendTestEmailCommand,
  SendEmailResult,
  EmailConfig
} from "../../contracts/IEmailService";

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
    resendApiKey: parsed.resendApiKey
  };
}

export class ResendEmailService implements IEmailService {
  private readonly apiBaseUrl = "https://api.resend.com";

  constructor(private readonly db: Database) {}

  async getConfig(): Promise<EmailConfig> {
    const row = this.db
      .prepare(`SELECT id, backendType, config, fromAddress, updatedAt FROM email_settings WHERE id = 1`)
      .get() as EmailSettingsRow | undefined;

    if (!row || row.backendType !== "RESEND") {
      throw new Error("Resend settings are not configured. Save configuration before using Resend operations.");
    }

    return rowToConfig(row);
  }

  async saveConfig(config: EmailConfig): Promise<void> {
    if (!config.resendApiKey || !config.resendApiKey.trim()) {
      throw new Error("Resend API key is required.");
    }

    const resendConfig = {
      resendApiKey: config.resendApiKey.trim(),
      connectionTimeoutMs: config.connectionTimeoutMs || 5000
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
        backendType: "RESEND",
        config: JSON.stringify(resendConfig),
        fromAddress: config.fromAddress,
        updatedAt: new Date().toISOString()
      });
  }

  async sendTestEmail(command: SendTestEmailCommand): Promise<void> {
    const result = await this.sendEmail({
      to: command.to,
      subject: command.subject ?? "Resend Test Email",
      body: command.body ?? "Resend configuration test completed successfully."
    });

    if (!result.success) {
      throw new Error(result.error || "Failed to send Resend test email");
    }
  }

  async sendEmail(command: {
    to: string;
    subject: string;
    body: string;
  }): Promise<SendEmailResult> {
    try {
      const config = await this.getConfig();

      const response = await fetch(`${this.apiBaseUrl}/emails`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${config.resendApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: config.fromAddress,
          to: command.to,
          subject: command.subject,
          html: command.body,
          text: command.body // Fallback plain text
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Resend API error: ${error.message || response.statusText}`);
      }

      const result = await response.json();
      return {
        success: true,
        messageId: result.id
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to send email via Resend"
      };
    }
  }
}
