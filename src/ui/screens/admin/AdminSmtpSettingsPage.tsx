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
  Title
} from "@mantine/core";
import type { SmtpConfig } from "../../../config/systemConfig";
import { runtimeHostAdapter } from "../../../platform/runtimeHostAdapter";

export function AdminSmtpSettingsPage(props?: { embedded?: boolean }): JSX.Element {
  const embedded = props?.embedded ?? false;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [testRecipient, setTestRecipient] = useState("");
  const [form, setForm] = useState({
    host: "",
    port: "1025",
    secure: false,
    user: "",
    pass: "",
    fromAddress: "",
    connectionTimeoutMs: "3000"
  });

  function mapConfigToForm(config: SmtpConfig) {
    return {
      host: config.host,
      port: String(config.port),
      secure: config.secure,
      user: config.user ?? "",
      pass: config.pass ?? "",
      fromAddress: config.fromAddress,
      connectionTimeoutMs: String(config.connectionTimeoutMs)
    };
  }

  function buildConfigFromForm(): SmtpConfig {
    const port = Number.parseInt(form.port, 10);
    const timeout = Number.parseInt(form.connectionTimeoutMs, 10);

    if (!form.host.trim()) {
      throw new Error("SMTP host is required.");
    }

    if (Number.isNaN(port) || port <= 0) {
      throw new Error("SMTP port must be a positive number.");
    }

    if (!form.fromAddress.trim()) {
      throw new Error("From address is required.");
    }

    if (Number.isNaN(timeout) || timeout <= 0) {
      throw new Error("Connection timeout must be a positive number.");
    }

    return {
      host: form.host.trim(),
      port,
      secure: form.secure,
      user: form.user.trim() || undefined,
      pass: form.pass || undefined,
      fromAddress: form.fromAddress.trim(),
      connectionTimeoutMs: timeout
    };
  }

  async function loadConfig(): Promise<void> {
    try {
      setLoading(true);
      setError(null);
      const config = await runtimeHostAdapter.smtpSettings.getConfig();
      setForm(mapConfigToForm(config));
      if (!testRecipient) {
        setTestRecipient(config.fromAddress);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load SMTP configuration.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadConfig();
  }, []);

  async function handleSave(): Promise<void> {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      const config = buildConfigFromForm();
      await runtimeHostAdapter.smtpSettings.saveConfig(config);
      setSuccess("SMTP configuration saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save SMTP configuration.");
    } finally {
      setSaving(false);
    }
  }

  async function handleTestSend(): Promise<void> {
    try {
      setTesting(true);
      setError(null);
      setSuccess(null);

      if (!testRecipient.trim()) {
        throw new Error("Provide a recipient email for test send.");
      }

      const config = buildConfigFromForm();
      await runtimeHostAdapter.smtpSettings.sendTestEmail({
        to: testRecipient.trim(),
        config,
        subject: "Coreman SMTP test",
        body: "This is a test email sent from Admin System Control."
      });

      setSuccess(`Test email sent to ${testRecipient.trim()}.`);
    } catch (testError) {
      setError(testError instanceof Error ? testError.message : "Unable to send test email.");
    } finally {
      setTesting(false);
    }
  }

  function handleFormKeyDownCapture(event: React.KeyboardEvent<HTMLElement>): void {
    const target = event.target as HTMLElement | null;
    if (!target) {
      return;
    }

    const tagName = target.tagName;
    const isFormField =
      tagName === "INPUT" ||
      tagName === "TEXTAREA" ||
      tagName === "SELECT" ||
      target.getAttribute("contenteditable") === "true";

    if (isFormField) {
        // Prevent app-level shortcuts from hijacking normal typing in form inputs
        event.stopPropagation();
        event.preventDefault();
    }
  }

  const content = (
    <Stack gap="lg" onKeyDownCapture={handleFormKeyDownCapture}>
      {!embedded && (
        <div>
          <Title order={2}>Admin - SMTP Settings</Title>
          <Text c="dimmed" size="sm">Configure SMTP transport and run test email delivery from this console.</Text>
        </div>
      )}

      {error && (
        <Alert color="red" title="SMTP Operation Failed">
          {error}
        </Alert>
      )}
      {success && (
        <Alert color="green" title="SMTP Operation Successful">
          {success}
        </Alert>
      )}

      <Card withBorder radius="md" p="md">
        {loading ? (
          <Group justify="center" py="xl">
            <Loader size="sm" />
          </Group>
        ) : (
          <Stack gap="md">
            <Title order={4}>SMTP Configuration</Title>
            <Group grow>
              <TextInput
                label="Host"
                value={form.host}
                onChange={(event) => setForm((current) => ({ ...current, host: event.currentTarget.value }))}
              />
              <TextInput
                label="Port"
                value={form.port}
                onChange={(event) => setForm((current) => ({ ...current, port: event.currentTarget.value }))}
              />
              <TextInput
                label="Connection Timeout (ms)"
                value={form.connectionTimeoutMs}
                onChange={(event) =>
                  setForm((current) => ({ ...current, connectionTimeoutMs: event.currentTarget.value }))
                }
              />
            </Group>

            <Group grow>
              <TextInput
                label="SMTP Username"
                value={form.user}
                onChange={(event) => setForm((current) => ({ ...current, user: event.currentTarget.value }))}
              />
              <TextInput
                label="SMTP Password"
                type="password"
                value={form.pass}
                onChange={(event) => setForm((current) => ({ ...current, pass: event.currentTarget.value }))}
              />
            </Group>

            <Group grow>
              <TextInput
                label="From Address"
                value={form.fromAddress}
                onChange={(event) =>
                  setForm((current) => ({ ...current, fromAddress: event.currentTarget.value }))
                }
              />
              <TextInput
                label="Test Recipient"
                value={testRecipient}
                onChange={(event) => setTestRecipient(event.currentTarget.value)}
              />
            </Group>

            <Switch
              label="Secure TLS"
              checked={form.secure}
              onChange={(event) => setForm((current) => ({ ...current, secure: event.currentTarget.checked }))}
            />

            <Group justify="flex-end">
              <Button variant="default" onClick={() => void loadConfig()}>Reload</Button>
              <Button variant="light" onClick={() => void handleTestSend()} loading={testing}>Test Send</Button>
              <Button onClick={() => void handleSave()} loading={saving}>Save Configuration</Button>
            </Group>
          </Stack>
        )}
      </Card>
    </Stack>
  );

  if (embedded) {
    return content;
  }

  return (
    <Container size="xl" py="lg">
      {content}
    </Container>
  );
}
