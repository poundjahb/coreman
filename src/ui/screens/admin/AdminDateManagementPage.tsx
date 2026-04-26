import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Container,
  Divider,
  Group,
  Loader,
  NumberInput,
  Stack,
  Text,
  Title
} from "@mantine/core";
import {
  defaultDateManagementThresholds,
  type DateManagementThresholds,
  validateDateManagementThresholds
} from "../../../domain/dateManagement";
import {
  loadDateManagementThresholds,
  saveDateManagementThresholds
} from "../../../application/modules/admin/dateManagement";

function cloneSettings(settings: DateManagementThresholds): DateManagementThresholds {
  return JSON.parse(JSON.stringify(settings)) as DateManagementThresholds;
}

function normalizeDayValue(value: string | number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return Math.max(0, parsed);
    }
  }

  return 0;
}

export function AdminDateManagementPage(_props?: { embedded?: boolean }): JSX.Element {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [settings, setSettings] = useState<DateManagementThresholds>(cloneSettings(defaultDateManagementThresholds));

  async function loadSettings(): Promise<void> {
    try {
      setLoading(true);
      setError(null);
      const loaded = await loadDateManagementThresholds();
      setSettings(cloneSettings(loaded));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load date management settings.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSettings();
  }, []);

  async function handleSave(): Promise<void> {
    const validationErrors = validateDateManagementThresholds(settings);
    if (validationErrors.length > 0) {
      setError(validationErrors.join(" "));
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      await saveDateManagementThresholds(settings);
      setSuccess("Date management settings saved.");
      setTimeout(() => setSuccess(null), 3000);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save date management settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Container size="md" py="lg">
      <Card withBorder radius="md" p="lg">
        <Stack gap="md">
          <div>
            <Title order={3}>Date Management</Title>
            <Text size="sm" c="dimmed">
              Configure reminder, escalation, and auto-close thresholds for assignments and recipient inaction.
            </Text>
          </div>

          {error && <Alert color="red">{error}</Alert>}
          {success && <Alert color="green">{success}</Alert>}

          {loading ? (
            <Group justify="center" py="md">
              <Loader />
            </Group>
          ) : (
            <>
              <Stack gap="sm">
                <Title order={5}>Assigned Action Thresholds</Title>
                <NumberInput
                  label="Reminder Days"
                  min={0}
                  step={1}
                  allowDecimal={false}
                  value={settings.assignmentThresholds.reminderDays}
                  onChange={(value) => setSettings((prev) => ({
                    ...prev,
                    assignmentThresholds: {
                      ...prev.assignmentThresholds,
                      reminderDays: normalizeDayValue(value)
                    }
                  }))}
                />
                <NumberInput
                  label="Escalation Days"
                  min={0}
                  step={1}
                  allowDecimal={false}
                  value={settings.assignmentThresholds.escalationDays}
                  onChange={(value) => setSettings((prev) => ({
                    ...prev,
                    assignmentThresholds: {
                      ...prev.assignmentThresholds,
                      escalationDays: normalizeDayValue(value)
                    }
                  }))}
                />
                <NumberInput
                  label="Auto-close Days"
                  min={0}
                  step={1}
                  allowDecimal={false}
                  value={settings.assignmentThresholds.autoCloseDays}
                  onChange={(value) => setSettings((prev) => ({
                    ...prev,
                    assignmentThresholds: {
                      ...prev.assignmentThresholds,
                      autoCloseDays: normalizeDayValue(value)
                    }
                  }))}
                />
              </Stack>

              <Divider my="xs" />

              <Stack gap="sm">
                <Title order={5}>Recipient Inaction Thresholds</Title>
                <NumberInput
                  label="Reminder Days"
                  min={0}
                  step={1}
                  allowDecimal={false}
                  value={settings.recipientInactionThresholds.reminderDays}
                  onChange={(value) => setSettings((prev) => ({
                    ...prev,
                    recipientInactionThresholds: {
                      ...prev.recipientInactionThresholds,
                      reminderDays: normalizeDayValue(value)
                    }
                  }))}
                />
                <NumberInput
                  label="Escalation Days"
                  min={0}
                  step={1}
                  allowDecimal={false}
                  value={settings.recipientInactionThresholds.escalationDays}
                  onChange={(value) => setSettings((prev) => ({
                    ...prev,
                    recipientInactionThresholds: {
                      ...prev.recipientInactionThresholds,
                      escalationDays: normalizeDayValue(value)
                    }
                  }))}
                />
                <NumberInput
                  label="Auto-close Days"
                  min={0}
                  step={1}
                  allowDecimal={false}
                  value={settings.recipientInactionThresholds.autoCloseDays}
                  onChange={(value) => setSettings((prev) => ({
                    ...prev,
                    recipientInactionThresholds: {
                      ...prev.recipientInactionThresholds,
                      autoCloseDays: normalizeDayValue(value)
                    }
                  }))}
                />
              </Stack>

              <Group justify="flex-end" mt="md">
                <Button variant="default" onClick={() => void loadSettings()}>
                  Reload
                </Button>
                <Button loading={saving} onClick={() => void handleSave()}>
                  Save
                </Button>
              </Group>
            </>
          )}
        </Stack>
      </Card>
    </Container>
  );
}
