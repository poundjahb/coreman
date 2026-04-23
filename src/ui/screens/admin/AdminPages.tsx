import { useEffect, useMemo, useState } from "react";
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Container,
  Group,
  Loader,
  MultiSelect,
  Progress,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  Tabs,
  Title
} from "@mantine/core";
import { Pencil, Trash2 } from "lucide-react";
import type { SmtpConfig } from "../../../config/systemConfig";
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
import {
  filterDepartmentsForBranch,
  isDepartmentAllowedForBranch
} from "../../../application/services/branchDepartmentPolicy";
import { runtimeHostAdapter } from "../../../platform/runtimeHostAdapter";

interface AdminPageProps {
  title: string;
  subtitle: string;
  rows: Array<{ name: string; value: string; status: string }>;
}

interface EditorState {
  id: string | null;
  code: string;
  name: string;
  isActive: boolean;
}

interface UserEditorState {
  id: string | null;
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

interface ActionDefinitionEditorState {
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
  defaultSlaDays: string;
  isActive: boolean;
}

function formatRoleLabel(role: RoleCode): string {
  return role
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

const roleOptions: Array<{ value: RoleCode; label: string }> = ALL_ROLE_CODES.map((role) => ({
  value: role,
  label: formatRoleLabel(role)
}));

const actionCategoryOptions: Array<{ value: CorrespondenceActionCategory; label: string }> = [
  { value: "INFO", label: "Information" },
  { value: "RESPONSE", label: "Response" },
  { value: "TASK", label: "Task" },
  { value: "PROCESS", label: "Process" }
];

const actionTriggerModeOptions: Array<{ value: ActionTriggerMode; label: string }> = [
  { value: "NONE", label: "No Workflow" },
  { value: "OWNER_EXECUTE", label: "Owner Execute" }
];

const actionWorkflowMethodOptions: Array<{ value: ActionWorkflowMethod; label: string }> = [
  { value: "POST", label: "POST" },
  { value: "PUT", label: "PUT" }
];

const actionAuthTypeOptions: Array<{ value: ActionWorkflowAuthType; label: string }> = [
  { value: "NONE", label: "None" },
  { value: "API_KEY", label: "API Key" },
  { value: "BEARER_TOKEN_REF", label: "Bearer Token Ref" }
];
const emptyEditorState: EditorState = {
  id: null,
  code: "",
  name: "",
  isActive: true
};

const emptyUserEditorState: UserEditorState = {
  id: null,
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

const emptyActionDefinitionEditorState: ActionDefinitionEditorState = {
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
  defaultSlaDays: "",
  isActive: true
};

function beginEditEntity(item: Branch | Department): EditorState {
  return {
    id: item.id,
    code: item.code,
    name: item.name,
    isActive: item.isActive
  };
}

function beginEditUser(user: AppUser): UserEditorState {
  return {
    id: user.id,
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

function beginEditActionDefinition(definition: CorrespondenceActionDefinition): ActionDefinitionEditorState {
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
    defaultSlaDays: definition.defaultSlaDays === undefined ? "" : String(definition.defaultSlaDays),
    isActive: definition.isActive
  };
}

function saveLabel(id: string | null, singularLabel: string): string {
  return id ? `Update ${singularLabel}` : `Create ${singularLabel}`;
}

function statusColor(isActive: boolean): string {
  return isActive ? "green" : "gray";
}

function CrudSummary(props: { label: string; value: string; hint: string }): JSX.Element {
  const { label, value, hint } = props;

  return (
    <Card withBorder radius="md" p="md">
      <Text size="sm" c="dimmed">{label}</Text>
      <Title order={3}>{value}</Title>
      <Text size="xs" c="dimmed" mt="xs">{hint}</Text>
    </Card>
  );
}

function CatalogManagementPage(props: {
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

function AdminPageScaffold({ title, subtitle, rows }: AdminPageProps): JSX.Element {
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

export function AdminBranchesPage(props?: { embedded?: boolean }): JSX.Element {
  const embedded = props?.embedded ?? false;
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorState>(emptyEditorState);

  async function loadBranches(): Promise<void> {
    try {
      setLoading(true);
      setError(null);
      setBranches(await runtimeHostAdapter.branches.findAll());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load branches.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadBranches();
  }, []);

  async function handleSave(): Promise<void> {
    if (!editor.code.trim() || !editor.name.trim()) {
      setError("Branch code and name are required.");
      return;
    }

    await runtimeHostAdapter.branches.save({
      id: editor.id ?? crypto.randomUUID(),
      code: editor.code.trim(),
      name: editor.name.trim(),
      isActive: editor.isActive
    });
    setEditor(emptyEditorState);
    await loadBranches();
  }

  async function handleDelete(branch: Branch): Promise<void> {
    if (!window.confirm(`Delete branch ${branch.name}?`)) {
      return;
    }

    await runtimeHostAdapter.branches.delete(branch.id);
    if (editor.id === branch.id) {
      setEditor(emptyEditorState);
    }
    await loadBranches();
  }

  return (
    <CatalogManagementPage
      title="Admin - Branches"
      subtitle="Create, update, activate, and remove branch records used throughout correspondence intake."
      singularLabel="Branch"
      items={branches}
      loading={loading}
      error={error}
      editor={editor}
      onEditorChange={(changes) => setEditor((current) => ({ ...current, ...changes }))}
      onReset={() => setEditor(emptyEditorState)}
      onSave={handleSave}
      onEdit={(item) => setEditor(beginEditEntity(item as Branch))}
      onDelete={handleDelete}
      embedded={embedded}
    />
  );
}

export function AdminReferenceDataPage(): JSX.Element {
  return (
    <Container size="xl" py="lg">
      <Stack gap="lg">
        <div>
          <Title order={2}>Admin - Reference Data</Title>
          <Text c="dimmed" size="sm">Manage branch and department reference data from a single entry point.</Text>
        </div>

        <Tabs defaultValue="branches" variant="outline">
          <Tabs.List>
            <Tabs.Tab value="branches">Branches</Tabs.Tab>
            <Tabs.Tab value="departments">Departments</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="branches" pt="md">
            <AdminBranchesPage embedded />
          </Tabs.Panel>

          <Tabs.Panel value="departments" pt="md">
            <AdminDepartmentsPage embedded />
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
}

export function AdminUsersPage(props: { onUsersChanged?: () => Promise<void> | void }): JSX.Element {
  const { onUsersChanged } = props;
  const [users, setUsers] = useState<AppUser[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<UserEditorState>(emptyUserEditorState);

  const branchOptions = useMemo(
    () => branches.map((branch) => ({ value: branch.id, label: `${branch.code} — ${branch.name}` })),
    [branches]
  );

  const allowedDepartments = useMemo(
    () => filterDepartmentsForBranch(editor.branchId, departments),
    [departments, editor.branchId]
  );

  const departmentOptions = useMemo(
    () =>
      allowedDepartments.map((department) => ({
        value: department.id,
        label: `${department.code} — ${department.name}`
      })),
    [allowedDepartments]
  );

  async function loadUsersPage(): Promise<void> {
    try {
      setLoading(true);
      setError(null);
      const [loadedUsers, loadedBranches, loadedDepartments] = await Promise.all([
        runtimeHostAdapter.users.findAll(),
        runtimeHostAdapter.branches.findAll(),
        runtimeHostAdapter.departments.findAll()
      ]);
      setUsers(loadedUsers);
      setBranches(loadedBranches);
      setDepartments(loadedDepartments);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load users.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUsersPage();
  }, []);

  useEffect(() => {
    if (!editor.branchId) {
      return;
    }

    if (!editor.departmentId) {
      setEditor((current) => ({ ...current, departmentId: allowedDepartments[0]?.id ?? null }));
      return;
    }

    if (!allowedDepartments.some((item) => item.id === editor.departmentId)) {
      setEditor((current) => ({ ...current, departmentId: allowedDepartments[0]?.id ?? null }));
    }
  }, [allowedDepartments, editor.branchId, editor.departmentId]);

  async function handleSave(): Promise<void> {
    if (!editor.employeeCode.trim() || !editor.fullName.trim() || !editor.email.trim()) {
      setError("Employee code, full name, and email are required.");
      return;
    }

    if (!editor.branchId || !editor.departmentId) {
      setError("Select both a branch and a department.");
      return;
    }

    if (!isDepartmentAllowedForBranch(editor.branchId, editor.departmentId)) {
      setError("The selected department is not allowed for the selected branch.");
      return;
    }

    if (editor.roles.length === 0) {
      setError("Assign at least one role to the user.");
      return;
    }

    await runtimeHostAdapter.users.save({
      id: editor.id ?? crypto.randomUUID(),
      employeeCode: editor.employeeCode.trim(),
      fullName: editor.fullName.trim(),
      email: editor.email.trim(),
      branchId: editor.branchId,
      departmentId: editor.departmentId,
      isActive: editor.isActive,
      canLogin: editor.canLogin,
      canOwnActions: editor.canOwnActions,
      roles: editor.roles
    });

    setEditor(emptyUserEditorState);
    await loadUsersPage();
    await onUsersChanged?.();
  }

  async function handleDelete(user: AppUser): Promise<void> {
    if (!window.confirm(`Delete user ${user.fullName}?`)) {
      return;
    }

    await runtimeHostAdapter.users.delete(user.id);
    if (editor.id === user.id) {
      setEditor(emptyUserEditorState);
    }
    await loadUsersPage();
    await onUsersChanged?.();
  }

  return (
    <Container size="xl" py="lg">
      <Stack gap="lg">
        <div>
          <Title order={2}>Admin - Users</Title>
          <Text c="dimmed" size="sm">Create, activate, deactivate, and manage branch, department, and role assignments for users.</Text>
        </div>

        {error && (
          <Alert color="red" title="Operation Failed">
            {error}
          </Alert>
        )}

        <SimpleGrid cols={{ base: 1, sm: 3 }}>
          <CrudSummary label="Total Users" value={String(users.length)} hint="Stored application users" />
          <CrudSummary label="Active Users" value={String(users.filter((user) => user.isActive).length)} hint="Enabled user accounts" />
          <CrudSummary label="Login Enabled" value={String(users.filter((user) => user.canLogin).length)} hint="Can sign into the workspace" />
        </SimpleGrid>

        <Card withBorder radius="md" p="md">
          <Stack gap="md">
            <Title order={4}>{editor.id ? "Edit User" : "Create User"}</Title>
            <Group grow>
              <TextInput label="Employee Code" value={editor.employeeCode} onChange={(event) => setEditor((current) => ({ ...current, employeeCode: event.currentTarget.value }))} />
              <TextInput label="Full Name" value={editor.fullName} onChange={(event) => setEditor((current) => ({ ...current, fullName: event.currentTarget.value }))} />
            </Group>
            <TextInput label="Email" value={editor.email} onChange={(event) => setEditor((current) => ({ ...current, email: event.currentTarget.value }))} />
            <Group grow>
              <Select label="Branch" value={editor.branchId} data={branchOptions} onChange={(value) => setEditor((current) => ({ ...current, branchId: value }))} />
              <Select label="Department" value={editor.departmentId} data={departmentOptions} onChange={(value) => setEditor((current) => ({ ...current, departmentId: value }))} />
            </Group>
            <MultiSelect
              label="Roles"
              value={editor.roles}
              data={roleOptions}
              onChange={(values) => setEditor((current) => ({ ...current, roles: values as RoleCode[] }))}
            />
            <Group grow>
              <Checkbox label="Active" checked={editor.isActive} onChange={(event) => setEditor((current) => ({ ...current, isActive: event.currentTarget.checked }))} />
              <Checkbox label="Can Login" checked={editor.canLogin} onChange={(event) => setEditor((current) => ({ ...current, canLogin: event.currentTarget.checked }))} />
              <Checkbox label="Can Own Actions" checked={editor.canOwnActions} onChange={(event) => setEditor((current) => ({ ...current, canOwnActions: event.currentTarget.checked }))} />
            </Group>
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setEditor(emptyUserEditorState)}>Clear</Button>
              <Button onClick={() => void handleSave()}>{saveLabel(editor.id, "User")}</Button>
            </Group>
          </Stack>
        </Card>

        <Card withBorder radius="md" p="md">
          {loading ? (
            <Group justify="center" py="xl">
              <Loader size="sm" />
            </Group>
          ) : (
            <Table.ScrollContainer minWidth={980}>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Employee Code</Table.Th>
                    <Table.Th>Name</Table.Th>
                    <Table.Th>Email</Table.Th>
                    <Table.Th>Roles</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {users.map((user) => (
                    <Table.Tr key={user.id}>
                      <Table.Td>{user.employeeCode}</Table.Td>
                      <Table.Td>{user.fullName}</Table.Td>
                      <Table.Td>{user.email}</Table.Td>
                      <Table.Td>{user.roles.join(", ")}</Table.Td>
                      <Table.Td>
                        <Badge color={statusColor(user.isActive)} variant="light">
                          {user.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <ActionIcon variant="light" color="blue" onClick={() => setEditor(beginEditUser(user))} aria-label={`Edit ${user.fullName}`}>
                            <Pencil size={16} />
                          </ActionIcon>
                          <ActionIcon variant="light" color="red" onClick={() => void handleDelete(user)} aria-label={`Delete ${user.fullName}`}>
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
    </Container>
  );
}

export function AdminDepartmentsPage(props?: { embedded?: boolean }): JSX.Element {
  const embedded = props?.embedded ?? false;
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorState>(emptyEditorState);

  async function loadDepartments(): Promise<void> {
    try {
      setLoading(true);
      setError(null);
      setDepartments(await runtimeHostAdapter.departments.findAll());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load departments.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDepartments();
  }, []);

  async function handleSave(): Promise<void> {
    if (!editor.code.trim() || !editor.name.trim()) {
      setError("Department code and name are required.");
      return;
    }

    await runtimeHostAdapter.departments.save({
      id: editor.id ?? crypto.randomUUID(),
      code: editor.code.trim(),
      name: editor.name.trim(),
      isActive: editor.isActive
    });
    setEditor(emptyEditorState);
    await loadDepartments();
  }

  async function handleDelete(department: Department): Promise<void> {
    if (!window.confirm(`Delete department ${department.name}?`)) {
      return;
    }

    await runtimeHostAdapter.departments.delete(department.id);
    if (editor.id === department.id) {
      setEditor(emptyEditorState);
    }
    await loadDepartments();
  }

  return (
    <CatalogManagementPage
      title="Admin - Departments"
      subtitle="Create, update, activate, and remove department records used for routing and reporting."
      singularLabel="Department"
      items={departments}
      loading={loading}
      error={error}
      editor={editor}
      onEditorChange={(changes) => setEditor((current) => ({ ...current, ...changes }))}
      onReset={() => setEditor(emptyEditorState)}
      onSave={handleSave}
      onEdit={(item) => setEditor(beginEditEntity(item as Department))}
      onDelete={handleDelete}
      embedded={embedded}
    />
  );
}

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

    const existing = editor.id
      ? definitions.find((definition) => definition.id === editor.id) ?? null
      : null;

    const definition = buildDefinitionFromEditor(existing);
    await runtimeHostAdapter.actionDefinitions.save(definition);
    setEditor(emptyActionDefinitionEditorState);
    await loadDefinitions();
  }

  async function handleDelete(definition: CorrespondenceActionDefinition): Promise<void> {
    if (!window.confirm(`Delete action ${definition.label}?`)) {
      return;
    }

    await runtimeHostAdapter.actionDefinitions.delete(definition.id);
    if (editor.id === definition.id) {
      setEditor(emptyActionDefinitionEditorState);
    }
    await loadDefinitions();
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
                  category: (value as CorrespondenceActionCategory | null) ?? "INFO"
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
                  triggerMode: (value as ActionTriggerMode | null) ?? "NONE",
                  workflowEnabled:
                    ((value as ActionTriggerMode | null) ?? "NONE") === "NONE"
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
                      workflowMethod: (value as ActionWorkflowMethod | null) ?? "POST"
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
                        authType: (value as ActionWorkflowAuthType | null) ?? "NONE",
                        authSecretRef:
                          ((value as ActionWorkflowAuthType | null) ?? "NONE") === "NONE"
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

export function AdminSystemControlPage(props?: { embedded?: boolean }): JSX.Element {
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
      // Prevent app-level/global shortcuts from hijacking normal typing in admin SMTP inputs.
      event.stopPropagation();
    }
  }

  const content = (
    <Stack gap="lg" onKeyDownCapture={handleFormKeyDownCapture}>
      {!embedded && (
        <div>
          <Title order={2}>Admin - System Control</Title>
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

export function AdminSystemControlTabPage(): JSX.Element {
  return (
    <Container size="xl" py="lg">
      <Stack gap="lg">
        <div>
          <Title order={2}>Admin - System Control</Title>
          <Text c="dimmed" size="sm">Manage SMTP settings and action definitions from a single entry point.</Text>
        </div>

        <Tabs defaultValue="smtp" variant="outline">
          <Tabs.List>
            <Tabs.Tab value="smtp">SMTP Settings</Tabs.Tab>
            <Tabs.Tab value="actions">Actions</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="smtp" pt="md">
            <AdminSystemControlPage embedded />
          </Tabs.Panel>

          <Tabs.Panel value="actions" pt="md">
            <AdminActionsCatalogPage embedded />
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
}

export function AdminFlowAgentsPage(): JSX.Element {
  return (
    <AdminPageScaffold
      title="Admin - Flow and Connected Agents"
      subtitle="Inspect flow orchestration and connected automation agents."
      rows={[
        { name: "Active Flows", value: "14", status: "Healthy" },
        { name: "Connected Agents", value: "9", status: "Healthy" },
        { name: "Failed Triggers", value: "1", status: "Investigate" }
      ]}
    />
  );
}

export function AdminAuditLogsPage(): JSX.Element {
  return (
    <AdminPageScaffold
      title="Admin - Audit Logs"
      subtitle="Review platform events, user activities, and policy-sensitive operations."
      rows={[
        { name: "Events Today", value: "1,843", status: "Ingesting" },
        { name: "Privileged Events", value: "57", status: "Monitored" },
        { name: "Alerted Events", value: "2", status: "Review" }
      ]}
    />
  );
}

export function AdminHealthPage(): JSX.Element {
  return (
    <AdminPageScaffold
      title="Admin - System Health"
      subtitle="Monitor service health, dependency status, and environment quality indicators."
      rows={[
        { name: "CPU Usage", value: "47%", status: "Normal" },
        { name: "Memory Usage", value: "61%", status: "Normal" },
        { name: "Database Latency", value: "18 ms", status: "Healthy" }
      ]}
    />
  );
}

export function AdminPerformancePage(): JSX.Element {
  return (
    <AdminPageScaffold
      title="Admin - Performance"
      subtitle="Evaluate throughput, latency, and system efficiency over time."
      rows={[
        { name: "Average Response", value: "263 ms", status: "Good" },
        { name: "Peak Throughput", value: "122 req/s", status: "Stable" },
        { name: "Error Rate", value: "0.4%", status: "Healthy" }
      ]}
    />
  );
}
