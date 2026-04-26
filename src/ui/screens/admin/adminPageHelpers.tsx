import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Container,
  Group,
  Loader,
  Progress,
  SimpleGrid,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  Title
} from "@mantine/core";
import { Pencil, Trash2 } from "lucide-react";
import type {
  ActionWorkflowAuthType,
  ActionWorkflowMethod,
  ActionTriggerMode,
  CorrespondenceActionCategory,
  CorrespondenceActionDefinition
} from "../../../domain/correspondenceAction";
import {
  ALL_ROLE_CODES,
  type AppUser,
  type Branch,
  type Department,
  type RoleCode
} from "../../../domain/governance";

export interface EditorState {
  id: string | null;
  code: string;
  name: string;
  isActive: boolean;
}

export interface UserEditorState {
  id: string | null;
  userId: string;
  employeeCode: string;
  fullName: string;
  email: string;
  branchId: string | null;
  departmentId: string | null;
  isActive: boolean;
  canLogin: boolean;
  canOwnActions: boolean;
  roles: RoleCode[];
}

export interface ActionDefinitionEditorState {
  id: string | null;
  code: string;
  label: string;
  description: string;
  category: CorrespondenceActionCategory;
  requiresOwner: boolean;
  triggerMode: ActionTriggerMode;
  workflowEnabled: boolean;
  workflowMethod: ActionWorkflowMethod;
  workflowEndpointUrl: string;
  workflowTimeoutMs: string;
  authType: ActionWorkflowAuthType;
  authSecretRef: string;
  payloadTemplate: string;
  retryMaxAttempts: string;
  retryBackoffMs: string;
  defaultDeadlineDays: string;
  isActive: boolean;
}

export interface AdminPageProps {
  title: string;
  subtitle: string;
  rows: Array<{ name: string; value: string; status: string }>;
}

export const emptyEditorState: EditorState = {
  id: null,
  code: "",
  name: "",
  isActive: true
};

export const emptyUserEditorState: UserEditorState = {
  id: null,
  userId: "",
  employeeCode: "",
  fullName: "",
  email: "",
  branchId: null,
  departmentId: null,
  isActive: true,
  canLogin: true,
  canOwnActions: false,
  roles: []
};

export const emptyActionDefinitionEditorState: ActionDefinitionEditorState = {
  id: null,
  code: "",
  label: "",
  description: "",
  category: "INFO",
  requiresOwner: false,
  triggerMode: "NONE",
  workflowEnabled: false,
  workflowMethod: "POST",
  workflowEndpointUrl: "",
  workflowTimeoutMs: "10000",
  authType: "NONE",
  authSecretRef: "",
  payloadTemplate: "",
  retryMaxAttempts: "0",
  retryBackoffMs: "0",
  defaultDeadlineDays: "",
  isActive: true
};

export function formatRoleLabel(role: RoleCode): string {
  return role
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

export const roleOptions: Array<{ value: RoleCode; label: string }> = ALL_ROLE_CODES.map((role) => ({
  value: role,
  label: formatRoleLabel(role)
}));

export const actionCategoryOptions: Array<{ value: CorrespondenceActionCategory; label: string }> = [
  { value: "INFO", label: "Information" },
  { value: "RESPONSE", label: "Response" },
  { value: "TASK", label: "Task" },
  { value: "PROCESS", label: "Process" }
];

export const actionTriggerModeOptions: Array<{ value: ActionTriggerMode; label: string }> = [
  { value: "NONE", label: "No Workflow" },
  { value: "OWNER_EXECUTE", label: "Owner Execute" }
];

export const actionWorkflowMethodOptions: Array<{ value: ActionWorkflowMethod; label: string }> = [
  { value: "POST", label: "POST" },
  { value: "PUT", label: "PUT" }
];

export const actionAuthTypeOptions: Array<{ value: ActionWorkflowAuthType; label: string }> = [
  { value: "NONE", label: "None" },
  { value: "API_KEY", label: "API Key" },
  { value: "BEARER_TOKEN_REF", label: "Bearer Token Ref" }
];

export function beginEditEntity(item: Branch | Department): EditorState {
  return {
    id: item.id,
    code: item.code,
    name: item.name,
    isActive: item.isActive
  };
}

export function beginEditUser(user: AppUser): UserEditorState {
  return {
    id: user.id,
    userId: user.userId,
    employeeCode: user.employeeCode,
    fullName: user.fullName,
    email: user.email,
    branchId: user.branchId,
    departmentId: user.departmentId,
    isActive: user.isActive,
    canLogin: user.canLogin,
    canOwnActions: user.canOwnActions,
    roles: user.roles
  };
}

export function beginEditActionDefinition(definition: CorrespondenceActionDefinition): ActionDefinitionEditorState {
  const defaultDeadlineDays = definition.defaultDeadlineDays ?? definition.defaultSlaDays;
  const defaultDeadlineDaysValue =
    defaultDeadlineDays === undefined || defaultDeadlineDays === 0
      ? ""
      : String(defaultDeadlineDays);

  return {
    id: definition.id,
    code: definition.code,
    label: definition.label,
    description: definition.description ?? "",
    category: definition.category,
    requiresOwner: definition.requiresOwner,
    triggerMode: definition.triggerMode,
    workflowEnabled: definition.workflowEnabled,
    workflowMethod: definition.workflowMethod,
    workflowEndpointUrl: definition.workflowEndpointUrl ?? "",
    workflowTimeoutMs: String(definition.workflowTimeoutMs),
    authType: definition.authType,
    authSecretRef: definition.authSecretRef ?? "",
    payloadTemplate: definition.payloadTemplate ?? "",
    retryMaxAttempts: String(definition.retryMaxAttempts),
    retryBackoffMs: String(definition.retryBackoffMs),
    defaultDeadlineDays: defaultDeadlineDaysValue,
    isActive: definition.isActive
  };
}

export function saveLabel(id: string | null, singularLabel: string): string {
  return id ? `Update ${singularLabel}` : `Create ${singularLabel}`;
}

export function statusColor(isActive: boolean): string {
  return isActive ? "green" : "gray";
}

export function CrudSummary(props: { label: string; value: string; hint: string }): JSX.Element {
  const { label, value, hint } = props;

  return (
    <Card withBorder radius="md" p="md">
      <Text size="sm" c="dimmed">{label}</Text>
      <Title order={3}>{value}</Title>
      <Text size="xs" c="dimmed" mt="xs">{hint}</Text>
    </Card>
  );
}

export function CatalogManagementPage(props: {
  title: string;
  subtitle: string;
  singularLabel: string;
  items: Array<Branch | Department>;
  loading: boolean;
  error: string | null;
  editor: EditorState;
  onEditorChange: (changes: Partial<EditorState>) => void;
  onReset: () => void;
  onSave: () => Promise<void>;
  onEdit: (item: Branch | Department) => void;
  onDelete: (item: Branch | Department) => Promise<void>;
  embedded?: boolean;
}): JSX.Element {
  const {
    title,
    subtitle,
    singularLabel,
    items,
    loading,
    error,
    editor,
    onEditorChange,
    onReset,
    onSave,
    onEdit,
    onDelete,
    embedded = false
  } = props;

  const content = (
    <Stack gap="lg">
      {!embedded && (
        <div>
          <Title order={2}>{title}</Title>
          <Text c="dimmed" size="sm">{subtitle}</Text>
        </div>
      )}

      {error && (
        <Alert color="red" title="Operation Failed">
          {error}
        </Alert>
      )}

      <SimpleGrid cols={{ base: 1, sm: 3 }}>
        <CrudSummary label="Total Records" value={String(items.length)} hint={`Configured ${singularLabel.toLowerCase()} records`} />
        <CrudSummary
          label="Active Records"
          value={String(items.filter((item) => item.isActive).length)}
          hint="Currently enabled for selection"
        />
        <Card withBorder radius="md" p="md">
          <Text size="sm" c="dimmed">Active Ratio</Text>
          <Progress value={items.length === 0 ? 0 : (items.filter((item) => item.isActive).length / items.length) * 100} mt="xs" />
        </Card>
      </SimpleGrid>

      <Card withBorder radius="md" p="md">
        <Stack gap="md">
          <Title order={4}>{editor.id ? `Edit ${singularLabel}` : `Create ${singularLabel}`}</Title>
          <Group grow>
            <TextInput
              label="Code"
              value={editor.code}
              onChange={(event) => onEditorChange({ code: event.currentTarget.value })}
            />
            <TextInput
              label="Name"
              value={editor.name}
              onChange={(event) => onEditorChange({ name: event.currentTarget.value })}
            />
          </Group>
          <Switch
            label="Active"
            checked={editor.isActive}
            onChange={(event) => onEditorChange({ isActive: event.currentTarget.checked })}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={onReset}>Clear</Button>
            <Button onClick={() => void onSave()}>{saveLabel(editor.id, singularLabel)}</Button>
          </Group>
        </Stack>
      </Card>

      <Card withBorder radius="md" p="md">
        {loading ? (
          <Group justify="center" py="xl">
            <Loader size="sm" />
          </Group>
        ) : (
          <Table.ScrollContainer minWidth={760}>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Code</Table.Th>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {items.map((item) => (
                  <Table.Tr key={item.id}>
                    <Table.Td>{item.code}</Table.Td>
                    <Table.Td>{item.name}</Table.Td>
                    <Table.Td>
                      <Badge color={statusColor(item.isActive)} variant="light">
                        {item.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <ActionIcon variant="light" color="blue" onClick={() => onEdit(item)} aria-label={`Edit ${item.name}`}>
                          <Pencil size={16} />
                        </ActionIcon>
                        <ActionIcon
                          variant="light"
                          color="red"
                          onClick={() => void onDelete(item)}
                          aria-label={`Delete ${item.name}`}
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

export function AdminPageScaffold({ title, subtitle, rows }: AdminPageProps): JSX.Element {
  return (
    <Container size="xl" py="lg">
      <Stack gap="lg">
        <div>
          <Title order={2}>{title}</Title>
          <Text c="dimmed" size="sm">{subtitle}</Text>
        </div>

        <SimpleGrid cols={{ base: 1, sm: 3 }}>
          <Card withBorder radius="md" p="md">
            <Text size="sm" c="dimmed">Active Items</Text>
            <Title order={3}>{rows.length}</Title>
          </Card>
          <Card withBorder radius="md" p="md">
            <Text size="sm" c="dimmed">Healthy Ratio</Text>
            <Title order={3}>94%</Title>
          </Card>
          <Card withBorder radius="md" p="md">
            <Text size="sm" c="dimmed">Capacity</Text>
            <Progress value={72} mt="xs" />
          </Card>
        </SimpleGrid>

        <Card withBorder radius="md" p="md">
          <Group justify="space-between" mb="sm">
            <Title order={4}>Operational Data</Title>
          </Group>
          <Table.ScrollContainer minWidth={760}>
            <Table striped>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Value</Table.Th>
                  <Table.Th>Status</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rows.map((row) => (
                  <Table.Tr key={row.name}>
                    <Table.Td>{row.name}</Table.Td>
                    <Table.Td>{row.value}</Table.Td>
                    <Table.Td>{row.status}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Card>
      </Stack>
    </Container>
  );
}
