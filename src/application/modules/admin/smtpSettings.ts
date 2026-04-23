import type { SmtpConfig } from "../../../config/systemConfig";
import { runtimeHostAdapter } from "../../../platform/runtimeHostAdapter";

export interface SendSmtpTestEmailInput {
  to: string;
  subject?: string;
  body?: string;
}

export async function loadSmtpSettingsConfig(): Promise<SmtpConfig> {
  return runtimeHostAdapter.smtpSettings.getConfig();
}

export async function saveSmtpSettingsConfig(config: SmtpConfig): Promise<void> {
  await runtimeHostAdapter.smtpSettings.saveConfig(config);
}

export async function sendSmtpTestEmailUsingSavedConfig(input: SendSmtpTestEmailInput): Promise<void> {
  await runtimeHostAdapter.smtpSettings.sendTestEmail({
    to: input.to,
    subject: input.subject,
    body: input.body
  });
}
