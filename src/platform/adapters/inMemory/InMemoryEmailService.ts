/**
 * In-memory email service for demo/testing purposes
 * Simulates all three email backends without actually sending emails
 */
import type { IEmailService, EmailConfig, SendTestEmailCommand } from "../../contracts/IEmailService";

export class InMemoryEmailService implements IEmailService {
  private config: EmailConfig | null = null;

  async getConfig(): Promise<EmailConfig> {
    if (!this.config) {
      throw new Error("Email settings are not configured.");
    }
    return this.config;
  }

  async saveConfig(config: EmailConfig): Promise<void> {
    this.config = {
      ...config,
      updatedAt: new Date().toISOString()
    };
  }

  async sendTestEmail(command: SendTestEmailCommand): Promise<void> {
    if (!this.config) {
      throw new Error("Email settings are not configured. Save configuration before sending a test email.");
    }

    // Simulate sending
    console.log(`[InMemory Email] Test email via ${this.config.backendType}: to=${command.to}, subject=${command.subject || "Test"}`);
  }

  async sendEmail(command: { to: string; subject: string; body: string }): Promise<any> {
    if (!this.config) {
      throw new Error("Email settings are not configured.");
    }

    console.log(`[InMemory Email] Sending via ${this.config.backendType}: to=${command.to}`);
    return {
      success: true,
      messageId: `in-memory-${Date.now()}`
    };
  }
}
