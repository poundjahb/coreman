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
  Title
} from "@mantine/core";
import { Pencil, Trash2 } from "lucide-react";
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
    onDelete
  } = props;

  return (
    <Container size="xl" py="lg">
      <Stack gap="lg">
        <div>
          <Title order={2}>{title}</Title>
          <Text c="dimmed" size="sm">{subtitle}</Text>
        </div>

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

export function AdminBranchesPage(): JSX.Element {
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
    />
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

export function AdminDepartmentsPage(): JSX.Element {
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
    />
  );
}

export function AdminActionsCatalogPage(): JSX.Element {
  return (
    <AdminPageScaffold
      title="Admin - Actions Catalog"
      subtitle="Define and maintain reusable action templates for correspondence workflows."
      rows={[
        { name: "Action Templates", value: "57", status: "Available" },
        { name: "Deprecated Actions", value: "4", status: "Review" },
        { name: "Template Coverage", value: "88%", status: "Good" }
      ]}
    />
  );
}

export function AdminSystemControlPage(): JSX.Element {
  return (
    <AdminPageScaffold
      title="Admin - System Control"
      subtitle="Start and stop platform services, adjust system posture, and verify control states."
      rows={[
        { name: "Core API", value: "Running", status: "Healthy" },
        { name: "Notification Worker", value: "Running", status: "Healthy" },
        { name: "Maintenance Mode", value: "Disabled", status: "Normal" }
      ]}
    />
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
