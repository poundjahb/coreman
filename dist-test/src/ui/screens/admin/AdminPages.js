import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { ActionIcon, Alert, Badge, Button, Card, Checkbox, Container, Group, Loader, MultiSelect, Progress, Select, SimpleGrid, Stack, Switch, Table, Text, TextInput, Title } from "@mantine/core";
import { Pencil, Trash2 } from "lucide-react";
import { ALL_ROLE_CODES } from "../../../domain/governance";
import { filterDepartmentsForBranch, isDepartmentAllowedForBranch } from "../../../application/services/branchDepartmentPolicy";
import { runtimeHostAdapter } from "../../../platform/runtimeHostAdapter";
function formatRoleLabel(role) {
    return role
        .split("_")
        .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
        .join(" ");
}
const roleOptions = ALL_ROLE_CODES.map((role) => ({
    value: role,
    label: formatRoleLabel(role)
}));
const emptyEditorState = {
    id: null,
    code: "",
    name: "",
    isActive: true
};
const emptyUserEditorState = {
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
function beginEditEntity(item) {
    return {
        id: item.id,
        code: item.code,
        name: item.name,
        isActive: item.isActive
    };
}
function beginEditUser(user) {
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
function saveLabel(id, singularLabel) {
    return id ? `Update ${singularLabel}` : `Create ${singularLabel}`;
}
function statusColor(isActive) {
    return isActive ? "green" : "gray";
}
function CrudSummary(props) {
    const { label, value, hint } = props;
    return (_jsxs(Card, { withBorder: true, radius: "md", p: "md", children: [_jsx(Text, { size: "sm", c: "dimmed", children: label }), _jsx(Title, { order: 3, children: value }), _jsx(Text, { size: "xs", c: "dimmed", mt: "xs", children: hint })] }));
}
function CatalogManagementPage(props) {
    const { title, subtitle, singularLabel, items, loading, error, editor, onEditorChange, onReset, onSave, onEdit, onDelete } = props;
    return (_jsx(Container, { size: "xl", py: "lg", children: _jsxs(Stack, { gap: "lg", children: [_jsxs("div", { children: [_jsx(Title, { order: 2, children: title }), _jsx(Text, { c: "dimmed", size: "sm", children: subtitle })] }), error && (_jsx(Alert, { color: "red", title: "Operation Failed", children: error })), _jsxs(SimpleGrid, { cols: { base: 1, sm: 3 }, children: [_jsx(CrudSummary, { label: "Total Records", value: String(items.length), hint: `Configured ${singularLabel.toLowerCase()} records` }), _jsx(CrudSummary, { label: "Active Records", value: String(items.filter((item) => item.isActive).length), hint: "Currently enabled for selection" }), _jsxs(Card, { withBorder: true, radius: "md", p: "md", children: [_jsx(Text, { size: "sm", c: "dimmed", children: "Active Ratio" }), _jsx(Progress, { value: items.length === 0 ? 0 : (items.filter((item) => item.isActive).length / items.length) * 100, mt: "xs" })] })] }), _jsx(Card, { withBorder: true, radius: "md", p: "md", children: _jsxs(Stack, { gap: "md", children: [_jsx(Title, { order: 4, children: editor.id ? `Edit ${singularLabel}` : `Create ${singularLabel}` }), _jsxs(Group, { grow: true, children: [_jsx(TextInput, { label: "Code", value: editor.code, onChange: (event) => onEditorChange({ code: event.currentTarget.value }) }), _jsx(TextInput, { label: "Name", value: editor.name, onChange: (event) => onEditorChange({ name: event.currentTarget.value }) })] }), _jsx(Switch, { label: "Active", checked: editor.isActive, onChange: (event) => onEditorChange({ isActive: event.currentTarget.checked }) }), _jsxs(Group, { justify: "flex-end", children: [_jsx(Button, { variant: "default", onClick: onReset, children: "Clear" }), _jsx(Button, { onClick: () => void onSave(), children: saveLabel(editor.id, singularLabel) })] })] }) }), _jsx(Card, { withBorder: true, radius: "md", p: "md", children: loading ? (_jsx(Group, { justify: "center", py: "xl", children: _jsx(Loader, { size: "sm" }) })) : (_jsx(Table.ScrollContainer, { minWidth: 760, children: _jsxs(Table, { striped: true, highlightOnHover: true, children: [_jsx(Table.Thead, { children: _jsxs(Table.Tr, { children: [_jsx(Table.Th, { children: "Code" }), _jsx(Table.Th, { children: "Name" }), _jsx(Table.Th, { children: "Status" }), _jsx(Table.Th, { children: "Actions" })] }) }), _jsx(Table.Tbody, { children: items.map((item) => (_jsxs(Table.Tr, { children: [_jsx(Table.Td, { children: item.code }), _jsx(Table.Td, { children: item.name }), _jsx(Table.Td, { children: _jsx(Badge, { color: statusColor(item.isActive), variant: "light", children: item.isActive ? "Active" : "Inactive" }) }), _jsx(Table.Td, { children: _jsxs(Group, { gap: "xs", children: [_jsx(ActionIcon, { variant: "light", color: "blue", onClick: () => onEdit(item), "aria-label": `Edit ${item.name}`, children: _jsx(Pencil, { size: 16 }) }), _jsx(ActionIcon, { variant: "light", color: "red", onClick: () => void onDelete(item), "aria-label": `Delete ${item.name}`, children: _jsx(Trash2, { size: 16 }) })] }) })] }, item.id))) })] }) })) })] }) }));
}
function AdminPageScaffold({ title, subtitle, rows }) {
    return (_jsx(Container, { size: "xl", py: "lg", children: _jsxs(Stack, { gap: "lg", children: [_jsxs("div", { children: [_jsx(Title, { order: 2, children: title }), _jsx(Text, { c: "dimmed", size: "sm", children: subtitle })] }), _jsxs(SimpleGrid, { cols: { base: 1, sm: 3 }, children: [_jsxs(Card, { withBorder: true, radius: "md", p: "md", children: [_jsx(Text, { size: "sm", c: "dimmed", children: "Active Items" }), _jsx(Title, { order: 3, children: rows.length })] }), _jsxs(Card, { withBorder: true, radius: "md", p: "md", children: [_jsx(Text, { size: "sm", c: "dimmed", children: "Healthy Ratio" }), _jsx(Title, { order: 3, children: "94%" })] }), _jsxs(Card, { withBorder: true, radius: "md", p: "md", children: [_jsx(Text, { size: "sm", c: "dimmed", children: "Capacity" }), _jsx(Progress, { value: 72, mt: "xs" })] })] }), _jsxs(Card, { withBorder: true, radius: "md", p: "md", children: [_jsx(Group, { justify: "space-between", mb: "sm", children: _jsx(Title, { order: 4, children: "Operational Data" }) }), _jsx(Table.ScrollContainer, { minWidth: 760, children: _jsxs(Table, { striped: true, children: [_jsx(Table.Thead, { children: _jsxs(Table.Tr, { children: [_jsx(Table.Th, { children: "Name" }), _jsx(Table.Th, { children: "Value" }), _jsx(Table.Th, { children: "Status" })] }) }), _jsx(Table.Tbody, { children: rows.map((row) => (_jsxs(Table.Tr, { children: [_jsx(Table.Td, { children: row.name }), _jsx(Table.Td, { children: row.value }), _jsx(Table.Td, { children: row.status })] }, row.name))) })] }) })] })] }) }));
}
export function AdminBranchesPage() {
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editor, setEditor] = useState(emptyEditorState);
    async function loadBranches() {
        try {
            setLoading(true);
            setError(null);
            setBranches(await runtimeHostAdapter.branches.findAll());
        }
        catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : "Unable to load branches.");
        }
        finally {
            setLoading(false);
        }
    }
    useEffect(() => {
        void loadBranches();
    }, []);
    async function handleSave() {
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
    async function handleDelete(branch) {
        if (!window.confirm(`Delete branch ${branch.name}?`)) {
            return;
        }
        await runtimeHostAdapter.branches.delete(branch.id);
        if (editor.id === branch.id) {
            setEditor(emptyEditorState);
        }
        await loadBranches();
    }
    return (_jsx(CatalogManagementPage, { title: "Admin - Branches", subtitle: "Create, update, activate, and remove branch records used throughout correspondence intake.", singularLabel: "Branch", items: branches, loading: loading, error: error, editor: editor, onEditorChange: (changes) => setEditor((current) => ({ ...current, ...changes })), onReset: () => setEditor(emptyEditorState), onSave: handleSave, onEdit: (item) => setEditor(beginEditEntity(item)), onDelete: handleDelete }));
}
export function AdminUsersPage(props) {
    const { onUsersChanged } = props;
    const [users, setUsers] = useState([]);
    const [branches, setBranches] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editor, setEditor] = useState(emptyUserEditorState);
    const branchOptions = useMemo(() => branches.map((branch) => ({ value: branch.id, label: `${branch.code} — ${branch.name}` })), [branches]);
    const allowedDepartments = useMemo(() => filterDepartmentsForBranch(editor.branchId, departments), [departments, editor.branchId]);
    const departmentOptions = useMemo(() => allowedDepartments.map((department) => ({
        value: department.id,
        label: `${department.code} — ${department.name}`
    })), [allowedDepartments]);
    async function loadUsersPage() {
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
        }
        catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : "Unable to load users.");
        }
        finally {
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
    async function handleSave() {
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
    async function handleDelete(user) {
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
    return (_jsx(Container, { size: "xl", py: "lg", children: _jsxs(Stack, { gap: "lg", children: [_jsxs("div", { children: [_jsx(Title, { order: 2, children: "Admin - Users" }), _jsx(Text, { c: "dimmed", size: "sm", children: "Create, activate, deactivate, and manage branch, department, and role assignments for users." })] }), error && (_jsx(Alert, { color: "red", title: "Operation Failed", children: error })), _jsxs(SimpleGrid, { cols: { base: 1, sm: 3 }, children: [_jsx(CrudSummary, { label: "Total Users", value: String(users.length), hint: "Stored application users" }), _jsx(CrudSummary, { label: "Active Users", value: String(users.filter((user) => user.isActive).length), hint: "Enabled user accounts" }), _jsx(CrudSummary, { label: "Login Enabled", value: String(users.filter((user) => user.canLogin).length), hint: "Can sign into the workspace" })] }), _jsx(Card, { withBorder: true, radius: "md", p: "md", children: _jsxs(Stack, { gap: "md", children: [_jsx(Title, { order: 4, children: editor.id ? "Edit User" : "Create User" }), _jsxs(Group, { grow: true, children: [_jsx(TextInput, { label: "Employee Code", value: editor.employeeCode, onChange: (event) => setEditor((current) => ({ ...current, employeeCode: event.currentTarget.value })) }), _jsx(TextInput, { label: "Full Name", value: editor.fullName, onChange: (event) => setEditor((current) => ({ ...current, fullName: event.currentTarget.value })) })] }), _jsx(TextInput, { label: "Email", value: editor.email, onChange: (event) => setEditor((current) => ({ ...current, email: event.currentTarget.value })) }), _jsxs(Group, { grow: true, children: [_jsx(Select, { label: "Branch", value: editor.branchId, data: branchOptions, onChange: (value) => setEditor((current) => ({ ...current, branchId: value })) }), _jsx(Select, { label: "Department", value: editor.departmentId, data: departmentOptions, onChange: (value) => setEditor((current) => ({ ...current, departmentId: value })) })] }), _jsx(MultiSelect, { label: "Roles", value: editor.roles, data: roleOptions, onChange: (values) => setEditor((current) => ({ ...current, roles: values })) }), _jsxs(Group, { grow: true, children: [_jsx(Checkbox, { label: "Active", checked: editor.isActive, onChange: (event) => setEditor((current) => ({ ...current, isActive: event.currentTarget.checked })) }), _jsx(Checkbox, { label: "Can Login", checked: editor.canLogin, onChange: (event) => setEditor((current) => ({ ...current, canLogin: event.currentTarget.checked })) }), _jsx(Checkbox, { label: "Can Own Actions", checked: editor.canOwnActions, onChange: (event) => setEditor((current) => ({ ...current, canOwnActions: event.currentTarget.checked })) })] }), _jsxs(Group, { justify: "flex-end", children: [_jsx(Button, { variant: "default", onClick: () => setEditor(emptyUserEditorState), children: "Clear" }), _jsx(Button, { onClick: () => void handleSave(), children: saveLabel(editor.id, "User") })] })] }) }), _jsx(Card, { withBorder: true, radius: "md", p: "md", children: loading ? (_jsx(Group, { justify: "center", py: "xl", children: _jsx(Loader, { size: "sm" }) })) : (_jsx(Table.ScrollContainer, { minWidth: 980, children: _jsxs(Table, { striped: true, highlightOnHover: true, children: [_jsx(Table.Thead, { children: _jsxs(Table.Tr, { children: [_jsx(Table.Th, { children: "Employee Code" }), _jsx(Table.Th, { children: "Name" }), _jsx(Table.Th, { children: "Email" }), _jsx(Table.Th, { children: "Roles" }), _jsx(Table.Th, { children: "Status" }), _jsx(Table.Th, { children: "Actions" })] }) }), _jsx(Table.Tbody, { children: users.map((user) => (_jsxs(Table.Tr, { children: [_jsx(Table.Td, { children: user.employeeCode }), _jsx(Table.Td, { children: user.fullName }), _jsx(Table.Td, { children: user.email }), _jsx(Table.Td, { children: user.roles.join(", ") }), _jsx(Table.Td, { children: _jsx(Badge, { color: statusColor(user.isActive), variant: "light", children: user.isActive ? "Active" : "Inactive" }) }), _jsx(Table.Td, { children: _jsxs(Group, { gap: "xs", children: [_jsx(ActionIcon, { variant: "light", color: "blue", onClick: () => setEditor(beginEditUser(user)), "aria-label": `Edit ${user.fullName}`, children: _jsx(Pencil, { size: 16 }) }), _jsx(ActionIcon, { variant: "light", color: "red", onClick: () => void handleDelete(user), "aria-label": `Delete ${user.fullName}`, children: _jsx(Trash2, { size: 16 }) })] }) })] }, user.id))) })] }) })) })] }) }));
}
export function AdminDepartmentsPage() {
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editor, setEditor] = useState(emptyEditorState);
    async function loadDepartments() {
        try {
            setLoading(true);
            setError(null);
            setDepartments(await runtimeHostAdapter.departments.findAll());
        }
        catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : "Unable to load departments.");
        }
        finally {
            setLoading(false);
        }
    }
    useEffect(() => {
        void loadDepartments();
    }, []);
    async function handleSave() {
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
    async function handleDelete(department) {
        if (!window.confirm(`Delete department ${department.name}?`)) {
            return;
        }
        await runtimeHostAdapter.departments.delete(department.id);
        if (editor.id === department.id) {
            setEditor(emptyEditorState);
        }
        await loadDepartments();
    }
    return (_jsx(CatalogManagementPage, { title: "Admin - Departments", subtitle: "Create, update, activate, and remove department records used for routing and reporting.", singularLabel: "Department", items: departments, loading: loading, error: error, editor: editor, onEditorChange: (changes) => setEditor((current) => ({ ...current, ...changes })), onReset: () => setEditor(emptyEditorState), onSave: handleSave, onEdit: (item) => setEditor(beginEditEntity(item)), onDelete: handleDelete }));
}
export function AdminActionsCatalogPage() {
    return (_jsx(AdminPageScaffold, { title: "Admin - Actions Catalog", subtitle: "Define and maintain reusable action templates for correspondence workflows.", rows: [
            { name: "Action Templates", value: "57", status: "Available" },
            { name: "Deprecated Actions", value: "4", status: "Review" },
            { name: "Template Coverage", value: "88%", status: "Good" }
        ] }));
}
export function AdminSystemControlPage() {
    return (_jsx(AdminPageScaffold, { title: "Admin - System Control", subtitle: "Start and stop platform services, adjust system posture, and verify control states.", rows: [
            { name: "Core API", value: "Running", status: "Healthy" },
            { name: "Notification Worker", value: "Running", status: "Healthy" },
            { name: "Maintenance Mode", value: "Disabled", status: "Normal" }
        ] }));
}
export function AdminFlowAgentsPage() {
    return (_jsx(AdminPageScaffold, { title: "Admin - Flow and Connected Agents", subtitle: "Inspect flow orchestration and connected automation agents.", rows: [
            { name: "Active Flows", value: "14", status: "Healthy" },
            { name: "Connected Agents", value: "9", status: "Healthy" },
            { name: "Failed Triggers", value: "1", status: "Investigate" }
        ] }));
}
export function AdminAuditLogsPage() {
    return (_jsx(AdminPageScaffold, { title: "Admin - Audit Logs", subtitle: "Review platform events, user activities, and policy-sensitive operations.", rows: [
            { name: "Events Today", value: "1,843", status: "Ingesting" },
            { name: "Privileged Events", value: "57", status: "Monitored" },
            { name: "Alerted Events", value: "2", status: "Review" }
        ] }));
}
export function AdminHealthPage() {
    return (_jsx(AdminPageScaffold, { title: "Admin - System Health", subtitle: "Monitor service health, dependency status, and environment quality indicators.", rows: [
            { name: "CPU Usage", value: "47%", status: "Normal" },
            { name: "Memory Usage", value: "61%", status: "Normal" },
            { name: "Database Latency", value: "18 ms", status: "Healthy" }
        ] }));
}
export function AdminPerformancePage() {
    return (_jsx(AdminPageScaffold, { title: "Admin - Performance", subtitle: "Evaluate throughput, latency, and system efficiency over time.", rows: [
            { name: "Average Response", value: "263 ms", status: "Good" },
            { name: "Peak Throughput", value: "122 req/s", status: "Stable" },
            { name: "Error Rate", value: "0.4%", status: "Healthy" }
        ] }));
}
