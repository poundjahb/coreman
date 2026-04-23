import type { Database } from "better-sqlite3";
import type { SmtpConfig } from "../../../config/systemConfig";
import type { ISmtpSettingsService, SendTestEmailCommand } from "../../contracts/ISmtpSettingsService";
import { NodemailerSqliteMailer } from "./SqliteMailer";

type SmtpSettingsRow = {
  host: string;
  port: number;
  secure: number;
  user: string | null;
  pass: string | null;
  fromAddress: string;
  connectionTimeoutMs: number;
};

function rowToConfig(row: SmtpSettingsRow): SmtpConfig {
  return {
    host: row.host,
    port: row.port,
    secure: row.secure === 1,
    user: row.user ?? undefined,
    pass: row.pass ?? undefined,
    fromAddress: row.fromAddress,
    connectionTimeoutMs: row.connectionTimeoutMs
  };
}

export class SqliteSmtpSettingsService implements ISmtpSettingsService {
  constructor(private readonly db: Database) {}

  async getConfig(): Promise<SmtpConfig> {
    const row = this.db
      .prepare(
        `SELECT host, port, secure, user, pass, fromAddress, connectionTimeoutMs
         FROM smtp_settings
         WHERE id = 1`
      )
      .get() as SmtpSettingsRow | undefined;

    if (!row) {
      throw new Error("SMTP settings are not configured. Save configuration before using SMTP operations.");
    }

    return rowToConfig(row);
  }

  async saveConfig(config: SmtpConfig): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO smtp_settings
          (id, host, port, secure, user, pass, fromAddress, connectionTimeoutMs, updatedAt)
         VALUES
          (1, @host, @port, @secure, @user, @pass, @fromAddress, @connectionTimeoutMs, @updatedAt)
         ON CONFLICT(id)
         DO UPDATE SET
           host = excluded.host,
           port = excluded.port,
           secure = excluded.secure,
           user = excluded.user,
           pass = excluded.pass,
           fromAddress = excluded.fromAddress,
           connectionTimeoutMs = excluded.connectionTimeoutMs,
           updatedAt = excluded.updatedAt`
      )
      .run({
        host: config.host,
        port: config.port,
        secure: config.secure ? 1 : 0,
        user: config.user ?? null,
        pass: config.pass ?? null,
        fromAddress: config.fromAddress,
        connectionTimeoutMs: config.connectionTimeoutMs,
        updatedAt: new Date().toISOString()
      });
  }

  async sendTestEmail(command: SendTestEmailCommand): Promise<void> {
    const subject = command.subject ?? "SMTP Test Email";
    const body = command.body ?? "SMTP configuration test completed successfully.";
    const config = command.config ?? (await this.getConfig());

    await new NodemailerSqliteMailer(config).send({
      to: command.to,
      subject,
      text: body
    });
  }
}
