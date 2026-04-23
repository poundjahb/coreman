import { useEffect, useMemo, useState } from "react";
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Container,
  Group,
  Loader,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  Title
} from "@mantine/core";
import { Pencil, Trash2 } from "lucide-react";
import type { CorrespondenceActionDefinition } from "../../../domain/correspondenceAction";
import { runtimeHostAdapter } from "../../../platform/runtimeHostAdapter";
import {
  type ActionDefinitionEditorState,
  actionAuthTypeOptions,
  actionCategoryOptions,
  actionTriggerModeOptions,
  actionWorkflowMethodOptions,
  beginEditActionDefinition,
  CrudSummary,
  emptyActionDefinitionEditorState,
  saveLabel,
  statusColor
} from "./adminPageHelpers";

export function AdminActionsCatalogPage(props?: { embedded?: boolean }): JSX.Element {
  const embedded = props?.embedded ?? false;
  const [definitions, setDefinitions] = useState<CorrespondenceActionDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<ActionDefinitionEditorState>(emptyActionDefinitionEditorState);

  const triggerEnabledCount = useMemo(
    () => definitions.filter((definition) => definition.triggerMode === "OWNER_EXECUTE" && definition.workflowEnabled).length,
    [definitions]
  );

  async function loadDefinitions(): Promise<void> {
    try {
      setLoading(true);
      setError(null);
      setDefinitions(await runtimeHostAdapter.actionDefinitions.findAll());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load action definitions.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDefinitions();
  }, []);

  function validateEditorState(): string | null {
    if (!editor.code.trim()) {
      return "Action code is required.";
    }

    if (!editor.label.trim()) {
      return "Action label is required.";
    }

    if (editor.triggerMode === "NONE" && editor.workflowEnabled) {
      return "Workflow must be disabled when trigger mode is set to NONE.";
    }

    if (!editor.workflowEnabled) {
      return null;
    }

    const endpoint = editor.workflowEndpointUrl.trim();
    if (!endpoint) {
      return "Workflow endpoint URL is required when workflow is enabled.";
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(endpoint);
    } catch {
      return "Workflow endpoint URL must be a valid HTTP or HTTPS URL.";
    }

    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return "Workflow endpoint URL must use HTTP or HTTPS.";
    }

    if (editor.authType !== "NONE" && !editor.authSecretRef.trim()) {
      return "Auth secret reference is required when auth type is not NONE.";
    }

    const timeout = Number.parseInt(editor.workflowTimeoutMs, 10);
    if (Number.isNaN(timeout) || timeout <= 0) {
      return "Workflow timeout must be a positive number of milliseconds.";
    }

    const retries = Number.parseInt(editor.retryMaxAttempts, 10);
    if (Number.isNaN(retries) || retries < 0 || retries > 10) {
      return "Retry max attempts must be between 0 and 10.";
    }

    const backoff = Number.parseInt(editor.retryBackoffMs, 10);
    if (Number.isNaN(backoff) || backoff < 0 || backoff > 60000) {
      return "Retry backoff must be between 0 and 60000 ms.";
    }

    return null;
  }

  function buildDefinitionFromEditor(existing: CorrespondenceActionDefinition | null): CorrespondenceActionDefinition {
    const now = new Date();
    const timeout = Number.parseInt(editor.workflowTimeoutMs, 10);
    const retries = Number.parseInt(editor.retryMaxAttempts, 10);
    const backoff = Number.parseInt(editor.retryBackoffMs, 10);
    const defaultSlaDays = editor.defaultSlaDays.trim()
      ? Number.parseInt(editor.defaultSlaDays.trim(), 10)
      : undefined;

    return {
      id: editor.id ?? crypto.randomUUID(),
      code: editor.code.trim().toUpperCase(),
      label: editor.label.trim(),
      description: editor.description.trim() || undefined,
      category: editor.category,
      requiresOwner: editor.requiresOwner,
      triggerMode: editor.triggerMode,
      workflowEnabled: editor.workflowEnabled,
      workflowMethod: editor.workflowMethod,
      workflowEndpointUrl: editor.workflowEnabled ? editor.workflowEndpointUrl.trim() : undefined,
      workflowTimeoutMs: timeout,
      authType: editor.authType,
      authSecretRef: editor.authType === "NONE" ? undefined : editor.authSecretRef.trim(),
      payloadTemplate: editor.payloadTemplate.trim() || undefined,
      retryMaxAttempts: retries,
      retryBackoffMs: backoff,
      defaultSlaDays,
      isActive: editor.isActive,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    };
  }

  async function handleSave(): Promise<void> {
    const validationError = validateEditorState();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setError(null);
      const existing = editor.id
        ? definitions.find((definition) => definition.id === editor.id) ?? null
        : null;

      const definition = buildDefinitionFromEditor(existing);
      await runtimeHostAdapter.actionDefinitions.save(definition);
      setEditor(emptyActionDefinitionEditorState);
      await loadDefinitions();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save action definition.");
    }
  }

  async function handleDelete(definition: CorrespondenceActionDefinition): Promise<void> {
    if (!window.confirm(`Delete action ${definition.label}?`)) {
      return;
    }

    try {
      setError(null);
      await runtimeHostAdapter.actionDefinitions.delete(definition.id);
      if (editor.id === definition.id) {
        setEditor(emptyActionDefinitionEditorState);
      }
      await loadDefinitions();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete action definition.");
    }
  }

  const content = (
    <Stack gap="lg">
      {!embedded && (
        <div>
          <Title order={2}>Admin - Actions Catalog</Title>
          <Text c="dimmed" size="sm">
            Define reusable correspondence actions and configure owner-triggered HTTP workflows.
          </Text>
        </div>
      )}

      {error && (
        <Alert color="red" title="Operation Failed">
          {error}
        </Alert>
      )}

      <SimpleGrid cols={{ base: 1, sm: 3 }}>
        <CrudSummary label="Total Actions" value={String(definitions.length)} hint="Configured action definitions" />
        <CrudSummary
          label="Active Actions"
          value={String(definitions.filter((definition) => definition.isActive).length)}
          hint="Available for assignment"
        />
        <CrudSummary
          label="Trigger Enabled"
          value={String(triggerEnabledCount)}
          hint="Owner execute workflow actions"
        />
      </SimpleGrid>

      <Card withBorder radius="md" p="md">
        <Stack gap="md">
          <Title order={4}>{editor.id ? "Edit Action Definition" : "Create Action Definition"}</Title>
          <Group grow>
            <TextInput
              label="Code"
              value={editor.code}
              onChange={(event) => setEditor((current) => ({ ...current, code: event.currentTarget.value }))}
            />
            <TextInput
              label="Label"
              value={editor.label}
              onChange={(event) => setEditor((current) => ({ ...current, label: event.currentTarget.value }))}
            />
          </Group>
          <TextInput
            label="Description"
            value={editor.description}
            onChange={(event) => setEditor((current) => ({ ...current, description: event.currentTarget.value }))}
          />
          <Group grow>
            <Select
              label="Category"
              value={editor.category}
              data={actionCategoryOptions}
              onChange={(value) =>
                setEditor((current) => ({
                  ...current,
                  category: (value as any) ?? "INFO"
                }))
              }
            />
            <Select
              label="Trigger Mode"
              value={editor.triggerMode}
              data={actionTriggerModeOptions}
              onChange={(value) =>
                setEditor((current) => ({
                  ...current,
                  triggerMode: (value as any) ?? "NONE",
                  workflowEnabled:
                    ((value as any) ?? "NONE") === "NONE"
                      ? false
                      : current.workflowEnabled
                }))
              }
            />
          </Group>
          <Group grow>
            <Switch
              label="Requires Owner"
              checked={editor.requiresOwner}
              onChange={(event) =>
                setEditor((current) => ({ ...current, requiresOwner: event.currentTarget.checked }))
              }
            />
            <Switch
              label="Active"
              checked={editor.isActive}
              onChange={(event) => setEditor((current) => ({ ...current, isActive: event.currentTarget.checked }))}
            />
            <Switch
              label="Workflow Enabled"
              checked={editor.workflowEnabled}
              disabled={editor.triggerMode === "NONE"}
              onChange={(event) =>
                setEditor((current) => ({ ...current, workflowEnabled: event.currentTarget.checked }))
              }
            />
          </Group>

          {editor.workflowEnabled && (
            <>
              <Group grow>
                <Select
                  label="HTTP Method"
                  value={editor.workflowMethod}
                  data={actionWorkflowMethodOptions}
                  onChange={(value) =>
                    setEditor((current) => ({
                      ...current,
                      workflowMethod: (value as any) ?? "POST"
                    }))
                  }
                />
                <TextInput
                  label="Timeout (ms)"
                  value={editor.workflowTimeoutMs}
                  onChange={(event) =>
                    setEditor((current) => ({ ...current, workflowTimeoutMs: event.currentTarget.value }))
                  }
                />
              </Group>
              <TextInput
                label="Endpoint URL"
                value={editor.workflowEndpointUrl}
                onChange={(event) =>
                  setEditor((current) => ({ ...current, workflowEndpointUrl: event.currentTarget.value }))
                }
              />
              <Group grow>
                <Select
                  label="Auth Type"
                  value={editor.authType}
                  data={actionAuthTypeOptions}
                  onChange={(value) =>
                    setEditor((current) => ({
                      ...current,
                      authType: (value as any) ?? "NONE",
                      authSecretRef:
                        ((value as any) ?? "NONE") === "NONE"
                          ? ""
                          : current.authSecretRef
                    }))
                  }
                />
                <TextInput
                  label="Auth Secret Ref"
                  value={editor.authSecretRef}
                  disabled={editor.authType === "NONE"}
                  onChange={(event) =>
                    setEditor((current) => ({ ...current, authSecretRef: event.currentTarget.value }))
                  }
                />
              </Group>
              <TextInput
                label="Payload Template"
                value={editor.payloadTemplate}
                onChange={(event) =>
                  setEditor((current) => ({ ...current, payloadTemplate: event.currentTarget.value }))
                }
              />
              <Group grow>
                <TextInput
                  label="Retry Max Attempts"
                  value={editor.retryMaxAttempts}
                  onChange={(event) =>
                    setEditor((current) => ({ ...current, retryMaxAttempts: event.currentTarget.value }))
                  }
                />
                <TextInput
                  label="Retry Backoff (ms)"
                  value={editor.retryBackoffMs}
                  onChange={(event) =>
                    setEditor((current) => ({ ...current, retryBackoffMs: event.currentTarget.value }))
                  }
                />
                <TextInput
                  label="Default SLA (days)"
                  value={editor.defaultSlaDays}
                  onChange={(event) =>
                    setEditor((current) => ({ ...current, defaultSlaDays: event.currentTarget.value }))
                  }
                />
              </Group>
            </>
          )}

          <Group justify="flex-end">
            <Button variant="default" onClick={() => setEditor(emptyActionDefinitionEditorState)}>
              Clear
            </Button>
            <Button onClick={() => void handleSave()}>{saveLabel(editor.id, "Action")}</Button>
          </Group>
        </Stack>
      </Card>

      <Card withBorder radius="md" p="md">
        {loading ? (
          <Group justify="center" py="xl">
            <Loader size="sm" />
          </Group>
        ) : (
          <Table.ScrollContainer minWidth={1080}>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Code</Table.Th>
                  <Table.Th>Label</Table.Th>
                  <Table.Th>Category</Table.Th>
                  <Table.Th>Trigger</Table.Th>
                  <Table.Th>Endpoint</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {definitions.map((definition) => (
                  <Table.Tr key={definition.id}>
                    <Table.Td>{definition.code}</Table.Td>
                    <Table.Td>{definition.label}</Table.Td>
                    <Table.Td>{definition.category}</Table.Td>
                    <Table.Td>
                      <Badge color={definition.workflowEnabled ? "blue" : "gray"} variant="light">
                        {definition.triggerMode === "NONE"
                          ? "No Workflow"
                          : definition.workflowEnabled
                            ? "Owner Execute -> HTTP"
                            : "Owner Execute"}
                      </Badge>
                    </Table.Td>
                    <Table.Td>{definition.workflowEndpointUrl ?? "-"}</Table.Td>
                    <Table.Td>
                      <Badge color={statusColor(definition.isActive)} variant="light">
                        {definition.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <ActionIcon
                          variant="light"
                          color="blue"
                          onClick={() => setEditor(beginEditActionDefinition(definition))}
                          aria-label={`Edit ${definition.label}`}
                        >
                          <Pencil size={16} />
                        </ActionIcon>
                        <ActionIcon
                          variant="light"
                          color="red"
                          onClick={() => void handleDelete(definition)}
                          aria-label={`Delete ${definition.label}`}
                        >
                          <Trash2 size={16} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
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
