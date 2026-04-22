import { getRuntimeSmtpConfig, type SmtpConfig } from "../../../config/systemConfig";
import type { ISmtpSettingsService, SendTestEmailCommand } from "../../contracts/ISmtpSettingsService";

export class InMemorySmtpSettingsService implements ISmtpSettingsService {
  private config: SmtpConfig;

  constructor(initialConfig?: SmtpConfig) {
    this.config = initialConfig ?? getRuntimeSmtpConfig();
  }

  async getConfig(): Promise<SmtpConfig> {
    return { ...this.config };
  }

  async saveConfig(config: SmtpConfig): Promise<void> {
    this.config = { ...config };
  }

  async sendTestEmail(_command: SendTestEmailCommand): Promise<void> {
    // In-memory mode does not have an SMTP transport.
  }
}
