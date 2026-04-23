import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Container,
  Group,
  Loader,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
  Select,
  PasswordInput,
  Textarea
} from "@mantine/core";
import type { EmailConfig } from "../../../platform/contracts/IEmailService";
import { runtimeHostAdapter, runtimePlatformTarget } from "../../../platform/runtimeHostAdapter";
import {
  loadEmailSettingsConfig,
  saveEmailSettingsConfig,
  sendEmailTestUsingSavedConfig,
  getEmailBackendDescription
} from "../../../application/modules/admin/emailSettings";

export function AdminEmailSettingsPage(props?: { embedded?: boolean }): JSX.Element {
  const embedded = props?.embedded ?? false;
  const activePlatformTarget = runtimeHostAdapter.platform.target;
  const configuredPlatformTarget = runtimePlatformTarget;
  const hasPlatformFallback = configuredPlatformTarget !== activePlatformTarget;
  const emailAvailable = activePlatformTarget === "SQLITE" || activePlatformTarget === "SERVER";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [testRecipient, setTestRecipient] = useState("");
  const [savedFormSignature, setSavedFormSignature] = useState<string | null>(null);

  const [form, setForm] = useState({
    backendType: "SMTP" as "SMTP" | "GRAPH_MAIL" | "RESEND",
    fromAddress: "",
    connectionTimeoutMs: "5000",
    // SMTP fields
    smtpHost: "",
    smtpPort: "1025",
    smtpSecure: false,
    smtpUser: "",
    smtpPass: "",
    // Graph Mail fields
    graphTenantId: "",
    graphClientId: "",
    graphClientSecret: "",
    // Resend fields
    resendApiKey: ""
  });

  function getFormSignature(nextForm: typeof form): string {
    return JSON.stringify(nextForm);
  }

  function mapConfigToForm(config: EmailConfig): typeof form {
    return {
      backendType: config.backendType,
      fromAddress: config.fromAddress,
      connectionTimeoutMs: String(config.connectionTimeoutMs),
      smtpHost: config.smtpHost ?? "",
      smtpPort: String(config.smtpPort ?? "1025"),
      smtpSecure: config.smtpSecure ?? false,
      smtpUser: config.smtpUser ?? "",
      smtpPass: config.smtpPass ?? "",
      graphTenantId: config.graphTenantId ?? "",
      graphClientId: config.graphClientId ?? "",
      graphClientSecret: config.graphClientSecret ?? "",
      resendApiKey: config.resendApiKey ?? ""
    };
  }

  function buildConfigFromForm(): EmailConfig {
    const timeout = Number.parseInt(form.connectionTimeoutMs, 10);

    if (!form.fromAddress.trim()) {
      throw new Error("From address is required.");
    }

    if (Number.isNaN(timeout) || timeout <= 0) {
      throw new Error("Connection timeout must be a positive number.");
    }

    if (form.backendType === "SMTP") {
      const port = Number.parseInt(form.smtpPort, 10);
      if (!form.smtpHost.trim()) {
        throw new Error("SMTP host is required.");
      }
      if (Number.isNaN(port) || port <= 0) {
        throw new Error("SMTP port must be a positive number.");
      }
      return {
        backendType: "SMTP",
        fromAddress: form.fromAddress.trim(),
        connectionTimeoutMs: timeout,
        smtpHost: form.smtpHost.trim(),
        smtpPort: port,
        smtpSecure: form.smtpSecure,
        smtpUser: form.smtpUser.trim() || undefined,
        smtpPass: form.smtpPass || undefined
      };
    } else if (form.backendType === "GRAPH_MAIL") {
      if (!form.graphTenantId.trim() || !form.graphClientId.trim() || !form.graphClientSecret.trim()) {
        throw new Error("Graph Mail API requires tenant ID, client ID, and client secret.");
      }
      return {
        backendType: "GRAPH_MAIL",
        fromAddress: form.fromAddress.trim(),
        connectionTimeoutMs: timeout,
        graphTenantId: form.graphTenantId.trim(),
        graphClientId: form.graphClientId.trim(),
        graphClientSecret: form.graphClientSecret.trim()
      };
    } else if (form.backendType === "RESEND") {
      if (!form.resendApiKey.trim()) {
        throw new Error("Resend API key is required.");
      }
      return {
        backendType: "RESEND",
        fromAddress: form.fromAddress.trim(),
        connectionTimeoutMs: timeout,
        resendApiKey: form.resendApiKey.trim()
      };
    } else {
      throw new Error(`Unknown backend type: ${form.backendType}`);
    }
  }

  async function loadConfig(): Promise<void> {
    try {
      setLoading(true);
      setError(null);
      const config = await loadEmailSettingsConfig();
      const mappedForm = mapConfigToForm(config);
      setForm(mappedForm);
      setSavedFormSignature(getFormSignature(mappedForm));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load email settings.";
      setError(message);
      console.error("Error loading email settings:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (emailAvailable) {
      void loadConfig();
    } else {
      setLoading(false);
      setError("Email settings are not available on this platform.");
    }
  }, [emailAvailable]);

  async function handleSave(): Promise<void> {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const config = buildConfigFromForm();
      await saveEmailSettingsConfig(config);

      const newSignature = getFormSignature(form);
      setSavedFormSignature(newSignature);
      setSuccess(`Email settings saved (${config.backendType})`);

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save email settings.";
      setError(message);
      console.error("Error saving email settings:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleTest(): Promise<void> {
    if (!testRecipient.trim()) {
      setError("Please enter a test recipient email address.");
      return;
    }

    const currentSignature = getFormSignature(form);
    if (currentSignature !== savedFormSignature) {
      setError("Please save configuration before sending a test email.");
      return;
    }

    try {
      setTesting(true);
      setError(null);
      setSuccess(null);

      await sendEmailTestUsingSavedConfig({
        to: testRecipient.trim(),
        subject: "Email Settings Test",
        body: "This is a test email from the correspondence management system."
      });

      setSuccess("Test email sent successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send test email.";
      setError(message);
      console.error("Error sending test email:", err);
    } finally {
      setTesting(false);
    }
  }

  const formHasChanges = getFormSignature(form) !== savedFormSignature;
  const backendDescription = form.backendType === "SMTP" ? `(${form.smtpHost}:${form.smtpPort})` : "";

  return (
    <Container size="md" py="xl">
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Stack gap="md">
          <div>
            <Title order={2}>Email Settings</Title>
            <Text size="sm" c="dimmed">
              Configure email backend: SMTP, Microsoft Graph Mail API, or Resend
            </Text>
          </div>

          {!emailAvailable && (
            <Alert color="yellow" title="Platform Not Supported">
              Email settings are not available on your platform ({activePlatformTarget}). This feature requires SQLITE or SERVER mode.
            </Alert>
          )}

          {hasPlatformFallback && emailAvailable && (
            <Alert color="blue" title="Platform Fallback">
              Configured platform ({configuredPlatformTarget}) differs from active ({activePlatformTarget}).
            </Alert>
          )}

          {error && <Alert color="red">{error}</Alert>}
          {success && <Alert color="green">{success}</Alert>}

          {loading ? (
            <Group justify="center">
              <Loader />
            </Group>
          ) : (
            <>
              {/* Backend Selector */}
              <Select
                label="Email Backend"
                placeholder="Select email backend"
                value={form.backendType}
                onChange={(value) => {
                  if (value) {
                    setForm((prev) => ({
                      ...prev,
                      backendType: value as "SMTP" | "GRAPH_MAIL" | "RESEND"
                    }));
                  }
                }}
                data={[
                  { value: "SMTP", label: "SMTP (Standard email protocol)" },
                  { value: "GRAPH_MAIL", label: "Microsoft Graph Mail API (Office 365)" },
                  { value: "RESEND", label: "Resend (Third-party modern email)" }
                ]}
                required
              />

              {/* Common From Address */}
              <TextInput
                label="From Address"
                placeholder="noreply@example.com"
                type="email"
                value={form.fromAddress}
                onChange={(e) => setForm((prev) => ({ ...prev, fromAddress: e.currentTarget.value }))}
                required
              />

              {/* SMTP Configuration */}
              {form.backendType === "SMTP" && (
                <>
                  <div>
                    <Text fw={500} mb="xs">
                      SMTP Configuration
                    </Text>
                  </div>

                  <TextInput
                    label="SMTP Host"
                    placeholder="smtp.gmail.com"
                    value={form.smtpHost}
                    onChange={(e) => setForm((prev) => ({ ...prev, smtpHost: e.currentTarget.value }))}
                    required
                  />

                  <TextInput
                    label="SMTP Port"
                    placeholder="1025"
                    type="number"
                    value={form.smtpPort}
                    onChange={(e) => setForm((prev) => ({ ...prev, smtpPort: e.currentTarget.value }))}
                    required
                  />

                  <Switch
                    label="Secure TLS"
                    description="ON for port 465 (implicit TLS), OFF for 587/1025 (STARTTLS/plain)"
                    checked={form.smtpSecure}
                    onChange={(e) => setForm((prev) => ({ ...prev, smtpSecure: e.currentTarget.checked }))}
                  />

                  <TextInput
                    label="Username (optional)"
                    placeholder="email@gmail.com"
                    value={form.smtpUser}
                    onChange={(e) => setForm((prev) => ({ ...prev, smtpUser: e.currentTarget.value }))}
                  />

                  <PasswordInput
                    label="Password (optional)"
                    placeholder="Enter SMTP password"
                    value={form.smtpPass}
                    onChange={(e) => setForm((prev) => ({ ...prev, smtpPass: e.currentTarget.value }))}
                  />
                </>
              )}

              {/* Graph Mail API Configuration */}
              {form.backendType === "GRAPH_MAIL" && (
                <>
                  <div>
                    <Text fw={500} mb="xs">
                      Microsoft Graph Mail API Configuration
                    </Text>
                  </div>

                  <Alert color="blue" title="Setup Required">
                    Create an Azure app registration and configure OAuth. See Microsoft Graph Mail API documentation for details.
                  </Alert>

                  <TextInput
                    label="Tenant ID"
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    value={form.graphTenantId}
                    onChange={(e) => setForm((prev) => ({ ...prev, graphTenantId: e.currentTarget.value }))}
                    required
                  />

                  <TextInput
                    label="Client ID (Application ID)"
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    value={form.graphClientId}
                    onChange={(e) => setForm((prev) => ({ ...prev, graphClientId: e.currentTarget.value }))}
                    required
                  />

                  <PasswordInput
                    label="Client Secret"
                    placeholder="Enter client secret value"
                    value={form.graphClientSecret}
                    onChange={(e) => setForm((prev) => ({ ...prev, graphClientSecret: e.currentTarget.value }))}
                    required
                  />

                  <Alert color="yellow" title="Token Refresh">
                    Access tokens expire after ~1 hour. Token refresh is not yet implemented. You will need to re-authenticate through the UI.
                  </Alert>
                </>
              )}

              {/* Resend Configuration */}
              {form.backendType === "RESEND" && (
                <>
                  <div>
                    <Text fw={500} mb="xs">
                      Resend Email API Configuration
                    </Text>
                  </div>

                  <Alert color="blue" title="Simple Setup">
                    Resend requires only an API key. Get your key from https://resend.com/api-keys
                  </Alert>

                  <PasswordInput
                    label="API Key"
                    placeholder="re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    value={form.resendApiKey}
                    onChange={(e) => setForm((prev) => ({ ...prev, resendApiKey: e.currentTarget.value }))}
                    required
                  />
                </>
              )}

              {/* Common Connection Timeout */}
              <TextInput
                label="Connection Timeout (ms)"
                placeholder="5000"
                type="number"
                value={form.connectionTimeoutMs}
                onChange={(e) => setForm((prev) => ({ ...prev, connectionTimeoutMs: e.currentTarget.value }))}
                description="Timeout for email operations in milliseconds"
              />

              {/* Save Button */}
              <Button
                onClick={() => void handleSave()}
                loading={saving}
                disabled={!formHasChanges}
                fullWidth
              >
                {saving ? "Saving..." : "Save Configuration"}
              </Button>

              {/* Test Email Section */}
              {savedFormSignature && (
                <>
                  <div style={{ borderTop: "1px solid #e9ecef", paddingTop: "1rem" }}>
                    <Text fw={500} mb="xs">
                      Test Email
                    </Text>
                  </div>

                  <TextInput
                    label="Test Recipient Email"
                    placeholder="recipient@example.com"
                    type="email"
                    value={testRecipient}
                    onChange={(e) => setTestRecipient(e.currentTarget.value)}
                  />

                  <Button
                    onClick={() => void handleTest()}
                    loading={testing}
                    disabled={!testRecipient.trim() || formHasChanges}
                    fullWidth
                    variant="light"
                  >
                    {testing ? "Sending..." : "Send Test Email"}
                  </Button>

                  {formHasChanges && (
                    <Alert color="yellow" size="sm">
                      Please save configuration before sending a test email.
                    </Alert>
                  )}
                </>
              )}
            </>
          )}
        </Stack>
      </Card>
    </Container>
  );
}
