import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Container,
  Group,
  Loader,
  MultiSelect,
  PasswordInput,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  ActionIcon
} from "@mantine/core";
import { Pencil, Trash2 } from "lucide-react";
import type { AppUser, Branch, Department, RoleCode } from "../../../domain/governance";
import {
  filterDepartmentsForBranch,
  isDepartmentAllowedForBranch
} from "../../../application/services/branchDepartmentPolicy";
import { runtimeHostAdapter } from "../../../platform/runtimeHostAdapter";
import {
  CrudSummary,
  emptyUserEditorState,
  type UserEditorState,
  beginEditUser,
  roleOptions,
  saveLabel,
  statusColor
} from "./adminPageHelpers";

export function AdminUsersPage(props: { onUsersChanged?: () => Promise<void> | void }): JSX.Element {
  const { onUsersChanged } = props;
  const [users, setUsers] = useState<AppUser[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<UserEditorState>(emptyUserEditorState);
  const [newPassword, setNewPassword] = useState("");

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
    if (!editor.userId.trim() || !editor.employeeCode.trim() || !editor.fullName.trim() || !editor.email.trim()) {
      setError("User ID, employee code, full name, and email are required.");
      return;
    }

    if (!editor.branchId || !editor.departmentId) {
      setError("Select both a branch and a department.");
      return;
    }

    if (!isDepartmentAllowedForBranch(editor.branchId, editor.departmentId, departments)) {
      setError("The selected department is not allowed for the selected branch.");
      return;
    }

    if (editor.roles.length === 0) {
      setError("Assign at least one role to the user.");
      return;
    }

    try {
      setError(null);
      const savedUserId = editor.id ?? crypto.randomUUID();
      await runtimeHostAdapter.users.save({
        id: savedUserId,
        userId: editor.userId.trim(),
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

      if (newPassword.trim().length >= 6) {
        const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
        const apiBase = (env?.VITE_API_BASE_URL ?? "http://localhost:3001").replace(/\/$/, "");
        const pwRes = await fetch(`${apiBase}/api/auth/set-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ userId: savedUserId, newPassword: newPassword.trim() })
        });

        if (!pwRes.ok) {
          const payload = await pwRes.json() as { error?: string };
          setError(payload.error ?? "User saved but password update failed.");
          await loadUsersPage();
          return;
        }
      }

      setEditor(emptyUserEditorState);
      setNewPassword("");
      await loadUsersPage();
      await onUsersChanged?.();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save user.");
    }
  }

  async function handleDelete(user: AppUser): Promise<void> {
    if (!window.confirm(`Delete user ${user.fullName}?`)) {
      return;
    }

    try {
      setError(null);
      await runtimeHostAdapter.users.delete(user.id);
      if (editor.id === user.id) {
        setEditor(emptyUserEditorState);
      }
      await loadUsersPage();
      await onUsersChanged?.();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete user.");
    }
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
              <TextInput label="User ID" placeholder="admin@coreman.com" value={editor.userId} onChange={(event) => setEditor((current) => ({ ...current, userId: event.currentTarget.value }))} />
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
            <PasswordInput
              label="Set Password"
              description="Leave empty to keep the current password. Minimum 6 characters."
              placeholder="New password (optional)"
              value={newPassword}
              onChange={(event) => setNewPassword(event.currentTarget.value)}
              autoComplete="new-password"
            />
            <Group justify="flex-end">
              <Button variant="default" onClick={() => { setEditor(emptyUserEditorState); setNewPassword(""); }}>Clear</Button>
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
                    <Table.Th>User ID</Table.Th>
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
                      <Table.Td>{user.userId}</Table.Td>
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
