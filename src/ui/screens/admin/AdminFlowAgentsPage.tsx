import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Container,
  Group,
  Loader,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Table,
  Tabs,
  Text,
  Title
} from "@mantine/core";
import { Pencil, RefreshCcw, Trash2 } from "lucide-react";
import type { CorrespondenceActionDefinition } from "../../../domain/correspondenceAction";
import type { WorkflowBindingRecord, WorkflowPluginRecord } from "../../../domain/workflowPlugin";
import { runtimeHostAdapter } from "../../../platform/runtimeHostAdapter";
import { CrudSummary } from "./adminPageHelpers";

type BindingEditorState = {
  id: string | null;
  bindingType: "EVENT" | "ACTION";
  triggerCode: string;
  actionDefinitionId: string | null;
  pluginKey: string | null;
  priority: number;
  isActive: boolean;
};

const emptyBindingEditorState: BindingEditorState = {
  id: null,
  bindingType: "EVENT",
  triggerCode: "CORRESPONDENCE_CREATED",
  actionDefinitionId: null,
  pluginKey: null,
  priority: 100,
  isActive: true
};

const workflowEventCodes = ["CORRESPONDENCE_CREATED", "ASSIGNMENT_CREATED"];

export function AdminFlowAgentsPage(): JSX.Element {
  const [plugins, setPlugins] = useState<WorkflowPluginRecord[]>([]);
  const [bindings, setBindings] = useState<WorkflowBindingRecord[]>([]);
  const [definitions, setDefinitions] = useState<CorrespondenceActionDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<BindingEditorState>(emptyBindingEditorState);

  const activePlugins = useMemo(() => plugins.filter((plugin) => plugin.isEnabled), [plugins]);
  const invalidPlugins = useMemo(() => plugins.filter((plugin) => !plugin.isValid), [plugins]);
  const eventBindings = useMemo(() => bindings.filter((binding) => binding.bindingType === "EVENT"), [bindings]);
  const actionBindings = useMemo(() => bindings.filter((binding) => binding.bindingType === "ACTION"), [bindings]);

  const pluginOptions = useMemo(
    () => plugins.map((plugin) => ({ value: plugin.pluginKey, label: `${plugin.name} (${plugin.pluginKey})` })),
    [plugins]
  );
  const actionOptions = useMemo(
    () => definitions.map((definition) => ({ value: definition.id, label: `${definition.label} (${definition.code})` })),
    [definitions]
  );
  const eventOptions = useMemo(() => {
    const discovered = plugins.flatMap((plugin) => plugin.supportedTriggers ?? []);
    const unique = Array.from(new Set([...workflowEventCodes, ...discovered])).filter((code) => code.trim().length > 0);
    return unique.map((code) => ({ value: code, label: code }));
  }, [plugins]);

  useEffect(() => {
    void loadPageData();
  }, []);

  async function loadPageData(): Promise<void> {
    try {
      setLoading(true);
      setError(null);
      const [catalog, actionDefinitions] = await Promise.all([
        runtimeHostAdapter.workflowPlugins.getCatalog(),
        runtimeHostAdapter.actionDefinitions.findAll()
      ]);
      setPlugins(catalog.plugins);
      setBindings(catalog.bindings);
      setDefinitions(actionDefinitions);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load workflow plugin catalog.");
    } finally {
      setLoading(false);
    }
  }

  function beginEdit(binding: WorkflowBindingRecord): void {
    const actionDefinitionId = typeof binding.actionDefinitionId === "string" ? binding.actionDefinitionId : null;

    setEditor({
      id: binding.id,
      bindingType: binding.bindingType,
      triggerCode: binding.triggerCode ?? "CORRESPONDENCE_CREATED",
      actionDefinitionId,
      pluginKey: binding.pluginKey,
      priority: binding.priority,
      isActive: binding.isActive
    });
  }

  function resetEditor(bindingType: "EVENT" | "ACTION" = editor.bindingType): void {
    setEditor({
      ...emptyBindingEditorState,
      bindingType,
      triggerCode: bindingType === "EVENT" ? "CORRESPONDENCE_CREATED" : ""
    });
  }

  function validateEditor(): string | null {
    if (!editor.pluginKey) {
      return "Select a plugin before saving the binding.";
    }
    if (editor.bindingType === "EVENT" && !editor.triggerCode.trim()) {
      return "Event trigger code is required.";
    }
    if (editor.bindingType === "ACTION" && !editor.actionDefinitionId) {
      return "Action definition is required for ACTION bindings.";
    }
    return null;
  }

  async function handleRefresh(): Promise<void> {
    try {
      setRefreshing(true);
      setError(null);
      await runtimeHostAdapter.workflowPlugins.refresh();
      await loadPageData();
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Failed to refresh workflow plugins.");
    } finally {
      setRefreshing(false);
    }
  }

  async function handleTogglePlugin(plugin: WorkflowPluginRecord, isEnabled: boolean): Promise<void> {
    try {
      setError(null);
      await runtimeHostAdapter.workflowPlugins.setPluginEnabled(plugin.pluginKey, isEnabled);
      await loadPageData();
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "Failed to update plugin state.");
    }
  }

  async function handleSaveBinding(): Promise<void> {
    const validationError = validateEditor();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await runtimeHostAdapter.workflowPlugins.saveBinding({
        id: editor.id ?? undefined,
        bindingType: editor.bindingType,
        triggerCode: editor.bindingType === "EVENT" ? editor.triggerCode.trim() : undefined,
        actionDefinitionId: editor.bindingType === "ACTION" ? editor.actionDefinitionId ?? undefined : undefined,
        pluginKey: editor.pluginKey ?? "",
        priority: editor.priority,
        isActive: editor.isActive
      });
      resetEditor(editor.bindingType);
      await loadPageData();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save workflow binding.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteBinding(binding: WorkflowBindingRecord): Promise<void> {
    if (!window.confirm(`Delete ${binding.bindingType} binding ${binding.id}?`)) {
      return;
    }

    try {
      setError(null);
      await runtimeHostAdapter.workflowPlugins.deleteBinding(binding.id);
      if (editor.id === binding.id) {
        resetEditor(binding.bindingType);
      }
      await loadPageData();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete workflow binding.");
    }
  }

  return (
    <Container size="xl" py="lg">
      <Stack gap="lg">
        <Group justify="space-between" align="end">
          <div>
            <Title order={2}>Admin - Flow and Connected Agents</Title>
            <Text c="dimmed" size="sm">
              Discover deployed workflow plugins, inspect validation state, and assign event or action bindings.
            </Text>
          </div>
          <Button leftSection={<RefreshCcw size={16} />} loading={refreshing} onClick={() => void handleRefresh()}>
            Refresh Plugins
          </Button>
        </Group>

        {error && (
          <Alert color="red" title="Workflow Management Error">
            {error}
          </Alert>
        )}

        {loading ? (
          <Group justify="center" py="xl">
            <Loader />
          </Group>
        ) : (
          <>
            <SimpleGrid cols={{ base: 1, sm: 3 }}>
              <CrudSummary label="Discovered Plugins" value={String(plugins.length)} hint="Plugins found in the runtime folder" />
              <CrudSummary label="Active Bindings" value={String(bindings.filter((binding) => binding.isActive).length)} hint="Bindings currently used by the engine" />
              <CrudSummary label="Invalid Plugins" value={String(invalidPlugins.length)} hint="Plugins blocked by manifest or export validation" />
            </SimpleGrid>

            {invalidPlugins.length > 0 && (
              <Alert color="yellow" title="Invalid Plugins Detected">
                <Stack gap="xs">
                  {invalidPlugins.map((plugin) => (
                    <Text key={plugin.pluginKey} size="sm">
                      {plugin.name}: {plugin.validationErrors.join(" ")}
                    </Text>
                  ))}
                </Stack>
              </Alert>
            )}

            <Card withBorder radius="md" p="md">
              <Stack gap="md">
                <Group justify="space-between">
                  <Title order={4}>Plugin Catalog</Title>
                  <Text size="sm" c="dimmed">{activePlugins.length} enabled</Text>
                </Group>
                <Table.ScrollContainer minWidth={900}>
                  <Table highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Name</Table.Th>
                        <Table.Th>Description</Table.Th>
                        <Table.Th>Version</Table.Th>
                        <Table.Th>Platform</Table.Th>
                        <Table.Th>Valid</Table.Th>
                        <Table.Th>Enabled</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {plugins.map((plugin) => (
                        <Table.Tr key={plugin.pluginKey}>
                          <Table.Td>
                            <Stack gap={0}>
                              <Text fw={600}>{plugin.name}</Text>
                              <Text size="xs" c="dimmed">{plugin.pluginKey}</Text>
                            </Stack>
                          </Table.Td>
                          <Table.Td>{plugin.description}</Table.Td>
                          <Table.Td>{plugin.version}</Table.Td>
                          <Table.Td>{plugin.platformTarget}</Table.Td>
                          <Table.Td>
                            <Badge color={plugin.isValid ? "green" : "yellow"} variant="light">
                              {plugin.isValid ? "Valid" : "Invalid"}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Switch
                              checked={plugin.isEnabled}
                              disabled={!plugin.isValid}
                              onChange={(event) => void handleTogglePlugin(plugin, event.currentTarget.checked)}
                            />
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </Table.ScrollContainer>
              </Stack>
            </Card>

            <Card withBorder radius="md" p="md">
              <Stack gap="md">
                <Title order={4}>{editor.id ? "Edit Binding" : "Create Binding"}</Title>
                <Tabs value={editor.bindingType} onChange={(value) => resetEditor((value as "EVENT" | "ACTION") ?? "EVENT")}>
                  <Tabs.List>
                    <Tabs.Tab value="EVENT">EVENT Bindings</Tabs.Tab>
                    <Tabs.Tab value="ACTION">ACTION Bindings</Tabs.Tab>
                  </Tabs.List>

                  <Tabs.Panel value="EVENT" pt="md">
                    <Stack gap="md">
                      <Group grow align="start">
                        <Select
                          label="Event Code"
                          data={eventOptions}
                          searchable
                          allowDeselect={false}
                          value={editor.bindingType === "EVENT" ? editor.triggerCode : ""}
                          onChange={(value) => setEditor((current) => ({
                            ...current,
                            bindingType: "EVENT",
                            triggerCode: value ?? "CORRESPONDENCE_CREATED"
                          }))}
                        />
                        <Select
                          label="Plugin"
                          data={pluginOptions}
                          value={editor.bindingType === "EVENT" ? editor.pluginKey : null}
                          onChange={(value) => setEditor((current) => ({
                            ...current,
                            bindingType: "EVENT",
                            pluginKey: value
                          }))}
                        />
                      </Group>
                      <Group grow align="end">
                        <NumberInput
                          label="Priority"
                          min={1}
                          value={editor.bindingType === "EVENT" ? editor.priority : 100}
                          onChange={(value) => setEditor((current) => ({
                            ...current,
                            bindingType: "EVENT",
                            priority: Number(value ?? 100)
                          }))}
                        />
                        <Switch
                          label="Binding Active"
                          checked={editor.bindingType === "EVENT" ? editor.isActive : true}
                          onChange={(event) => setEditor((current) => ({
                            ...current,
                            bindingType: "EVENT",
                            isActive: event.currentTarget.checked
                          }))}
                        />
                      </Group>
                    </Stack>
                  </Tabs.Panel>

                  <Tabs.Panel value="ACTION" pt="md">
                    <Stack gap="md">
                      <Group grow align="start">
                        <Select
                          label="Action Definition"
                          data={actionOptions}
                          searchable
                          value={editor.bindingType === "ACTION" ? editor.actionDefinitionId : null}
                          onChange={(value) => setEditor((current) => ({
                            ...current,
                            bindingType: "ACTION",
                            actionDefinitionId: value
                          }))}
                        />
                        <Select
                          label="Plugin"
                          data={pluginOptions}
                          value={editor.bindingType === "ACTION" ? editor.pluginKey : null}
                          onChange={(value) => setEditor((current) => ({
                            ...current,
                            bindingType: "ACTION",
                            pluginKey: value
                          }))}
                        />
                      </Group>
                      <Group grow align="end">
                        <NumberInput
                          label="Priority"
                          min={1}
                          value={editor.bindingType === "ACTION" ? editor.priority : 100}
                          onChange={(value) => setEditor((current) => ({
                            ...current,
                            bindingType: "ACTION",
                            priority: Number(value ?? 100)
                          }))}
                        />
                        <Switch
                          label="Binding Active"
                          checked={editor.bindingType === "ACTION" ? editor.isActive : true}
                          onChange={(event) => setEditor((current) => ({
                            ...current,
                            bindingType: "ACTION",
                            isActive: event.currentTarget.checked
                          }))}
                        />
                      </Group>
                    </Stack>
                  </Tabs.Panel>
                </Tabs>

                <Group justify="flex-end">
                  <Button variant="default" onClick={() => resetEditor(editor.bindingType)}>Reset</Button>
                  <Button loading={saving} onClick={() => void handleSaveBinding()}>Save Binding</Button>
                </Group>
              </Stack>
            </Card>

            <SimpleGrid cols={{ base: 1, lg: 2 }}>
              <BindingTable
                title="EVENT Bindings"
                bindings={eventBindings}
                plugins={plugins}
                actionDefinitions={definitions}
                onEdit={beginEdit}
                onDelete={handleDeleteBinding}
              />
              <BindingTable
                title="ACTION Bindings"
                bindings={actionBindings}
                plugins={plugins}
                actionDefinitions={definitions}
                onEdit={beginEdit}
                onDelete={handleDeleteBinding}
              />
            </SimpleGrid>
          </>
        )}
      </Stack>
    </Container>
  );
}

function BindingTable(props: {
  title: string;
  bindings: WorkflowBindingRecord[];
  plugins: WorkflowPluginRecord[];
  actionDefinitions: CorrespondenceActionDefinition[];
  onEdit: (binding: WorkflowBindingRecord) => void;
  onDelete: (binding: WorkflowBindingRecord) => Promise<void>;
}): JSX.Element {
  const { title, bindings, plugins, actionDefinitions, onEdit, onDelete } = props;

  function resolvePluginName(pluginKey: string): string {
    return plugins.find((plugin) => plugin.pluginKey === pluginKey)?.name ?? pluginKey;
  }

  function resolveTrigger(binding: WorkflowBindingRecord): string {
    if (binding.bindingType === "EVENT") {
      return binding.triggerCode ?? "-";
    }

    const action = actionDefinitions.find((definition) => definition.id === binding.actionDefinitionId);
    return action ? `${action.label} (${action.code})` : binding.actionDefinitionId ?? "-";
  }

  return (
    <Card withBorder radius="md" p="md">
      <Stack gap="md">
        <Group justify="space-between">
          <Title order={4}>{title}</Title>
          <Text size="sm" c="dimmed">{bindings.length} configured</Text>
        </Group>
        <Table.ScrollContainer minWidth={520}>
          <Table highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Trigger</Table.Th>
                <Table.Th>Plugin</Table.Th>
                <Table.Th>Priority</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {bindings.map((binding) => (
                <Table.Tr key={binding.id}>
                  <Table.Td>{resolveTrigger(binding)}</Table.Td>
                  <Table.Td>{resolvePluginName(binding.pluginKey)}</Table.Td>
                  <Table.Td>{binding.priority}</Table.Td>
                  <Table.Td>
                    <Badge color={binding.isActive ? "green" : "gray"} variant="light">
                      {binding.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <Button variant="subtle" size="compact-sm" leftSection={<Pencil size={14} />} onClick={() => onEdit(binding)}>
                        Edit
                      </Button>
                      <Button
                        color="red"
                        variant="subtle"
                        size="compact-sm"
                        leftSection={<Trash2 size={14} />}
                        onClick={() => void onDelete(binding)}
                      >
                        Delete
                      </Button>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Stack>
    </Card>
  );
}
