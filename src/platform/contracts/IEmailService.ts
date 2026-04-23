/**
 * Generic email service interface supporting multiple backends:
 * - SMTP (built-in nodemailer)
 * - GRAPH_MAIL (Microsoft 365 Graph Mail API)
 * - RESEND (third-party modern email API)
 */

export type EmailBackendType = "SMTP" | "GRAPH_MAIL" | "RESEND";

/**
 * Polymorphic email configuration.
 * Each backend type uses only its relevant fields; others are undefined.
 */
export interface EmailConfig {
  backendType: EmailBackendType;
  fromAddress: string;
  connectionTimeoutMs: number;
  updatedAt?: string;

  // SMTP-specific fields
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser?: string;
  smtpPass?: string;

  // Graph Mail API fields
  graphTenantId?: string;
  graphClientId?: string;
  graphClientSecret?: string;
  graphAccessToken?: string;
  graphRefreshToken?: string;

  // Resend API fields
  resendApiKey?: string;
}

/**
 * Request to send a test email (generic across all backends)
 */
export interface SendTestEmailCommand {
  to: string;
  subject?: string;
  body?: string;
}

/**
 * Response from sending an email
 */
export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Generic email service interface
 * Implementations: SmtpEmailService, GraphMailEmailService, ResendEmailService
 */
export interface IEmailService {
  /**
   * Load current backend configuration
   */
  getConfig(): Promise<EmailConfig>;

  /**
   * Save backend configuration
   */
  saveConfig(config: EmailConfig): Promise<void>;

  /**
   * Send a test email to validate configuration
   */
  sendTestEmail(command: SendTestEmailCommand): Promise<void>;

  /**
   * Send an email (generic interface, same across backends)
   */
  sendEmail(command: {
    to: string;
    subject: string;
    body: string;
  }): Promise<SendEmailResult>;
}
