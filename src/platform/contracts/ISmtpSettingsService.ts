import type { SmtpConfig } from "../../config/systemConfig";

export interface SendTestEmailCommand {
  to: string;
  config?: SmtpConfig;
  subject?: string;
  body?: string;
}

export interface ISmtpSettingsService {
  getConfig(): Promise<SmtpConfig>;
  saveConfig(config: SmtpConfig): Promise<void>;
  sendTestEmail(command: SendTestEmailCommand): Promise<void>;
}
