/**
 * Microsoft Graph Mail API backend implementation
 * Supports Microsoft 365 environments using OAuth token authentication
 * https://learn.microsoft.com/en-us/graph/api/user-post-messages
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
    graphTenantId: parsed.graphTenantId,
    graphClientId: parsed.graphClientId,
    graphClientSecret: parsed.graphClientSecret,
    graphAccessToken: parsed.graphAccessToken,
    graphRefreshToken: parsed.graphRefreshToken
  };
}

export class GraphMailEmailService implements IEmailService {
  private readonly graphApiBase = "https://graph.microsoft.com/v1.0";
  private readonly authEndpoint = "https://login.microsoftonline.com";

  constructor(private readonly db: Database) {}

  async getConfig(): Promise<EmailConfig> {
    const row = this.db
      .prepare(`SELECT id, backendType, config, fromAddress, updatedAt FROM email_settings WHERE id = 1`)
      .get() as EmailSettingsRow | undefined;

    if (!row || row.backendType !== "GRAPH_MAIL") {
      throw new Error("Graph Mail API settings are not configured. Save configuration before using Graph Mail.");
    }

    return rowToConfig(row);
  }

  async saveConfig(config: EmailConfig): Promise<void> {
    if (!config.graphTenantId || !config.graphClientId || !config.graphClientSecret) {
      throw new Error("Graph Mail API requires tenant ID, client ID, and client secret.");
    }

    const graphConfig = {
      graphTenantId: config.graphTenantId.trim(),
      graphClientId: config.graphClientId.trim(),
      graphClientSecret: config.graphClientSecret.trim(),
      graphAccessToken: config.graphAccessToken,
      graphRefreshToken: config.graphRefreshToken,
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
        backendType: "GRAPH_MAIL",
        config: JSON.stringify(graphConfig),
        fromAddress: config.fromAddress,
        updatedAt: new Date().toISOString()
      });
  }

  async sendTestEmail(command: SendTestEmailCommand): Promise<void> {
    const result = await this.sendEmail({
      to: command.to,
      subject: command.subject ?? "Graph Mail API Test Email",
      body: command.body ?? "Graph Mail API configuration test completed successfully."
    });

    if (!result.success) {
      throw new Error(result.error || "Failed to send Graph Mail API test email");
    }
  }

  async sendEmail(command: {
    to: string;
    subject: string;
    body: string;
  }): Promise<SendEmailResult> {
    try {
      const config = await this.getConfig();

      // For now, ensure we have a valid access token
      // In production, implement token refresh logic
      if (!config.graphAccessToken) {
        throw new Error("Graph Mail API access token not available. Please re-authenticate.");
      }

      const response = await fetch(`${this.graphApiBase}/me/sendMail`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${config.graphAccessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: {
            subject: command.subject,
            body: {
              contentType: "HTML",
              content: command.body
            },
            toRecipients: [
              {
                emailAddress: {
                  address: command.to
                }
              }
            ]
          },
          saveToSentItems: true
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Graph Mail API error: ${error.error?.message || response.statusText}`);
      }

      return {
        success: true,
        messageId: "sent-via-graph-mail-api"
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to send email via Graph Mail API"
      };
    }
  }
}
