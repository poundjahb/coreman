/**
 * Application module for email settings management.
 * Routes to correct backend implementation based on configured type (SMTP, Graph Mail API, or Resend).
 */
import type { EmailConfig } from "../../../platform/contracts/IEmailService";
import { runtimeHostAdapter } from "../../../platform/runtimeHostAdapter";

export interface SendEmailTestInput {
  to: string;
  subject?: string;
  body?: string;
}

/**
 * Load current email settings config (backend-agnostic)
 */
export async function loadEmailSettingsConfig(): Promise<EmailConfig> {
  try {
    const config = await runtimeHostAdapter.emailSettings.getConfig();
    return config;
  } catch (error) {
    throw error instanceof Error ? error : new Error("Failed to load email settings");
  }
}

/**
 * Save email settings for the configured backend
 */
export async function saveEmailSettingsConfig(config: EmailConfig): Promise<void> {
  try {
    await runtimeHostAdapter.emailSettings.saveConfig(config);
  } catch (error) {
    throw error instanceof Error ? error : new Error("Failed to save email settings");
  }
}

/**
 * Send test email using saved configuration
 * Backend type is determined from saved config
 */
export async function sendEmailTestUsingSavedConfig(input: SendEmailTestInput): Promise<void> {
  try {
    await runtimeHostAdapter.emailSettings.sendTestEmail({
      to: input.to,
      subject: input.subject,
      body: input.body
    });
  } catch (error) {
    throw error instanceof Error ? error : new Error("Failed to send test email");
  }
}

/**
 * Get backend-agnostic description of current configuration
 */
export async function getEmailBackendDescription(): Promise<string> {
  try {
    const config = await loadEmailSettingsConfig();

    switch (config.backendType) {
      case "SMTP":
        return `SMTP (${config.smtpHost}:${config.smtpPort}, TLS: ${config.smtpSecure ? "ON" : "OFF"})`;
      case "GRAPH_MAIL":
        return "Microsoft Graph Mail API (OAuth)";
      case "RESEND":
        return "Resend Email API";
      default:
        return "Unknown email backend";
    }
  } catch {
    return "No email backend configured";
  }
}
