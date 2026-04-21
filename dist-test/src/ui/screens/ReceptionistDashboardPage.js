import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { Alert, Badge, Button, Card, Container, Loader, Group, Select, Stack, Table, Text, TextInput, Title } from "@mantine/core";
import { useNavigate } from "react-router-dom";
import { hasRole } from "../../application/services/accessControl";
import { runtimeHostAdapter } from "../../platform/runtimeHostAdapter";
const DIRECTION_OPTIONS = [
    { value: "all", label: "All" },
    { value: "INCOMING", label: "Incoming" },
    { value: "OUTGOING", label: "Outgoing" }
];
const STATUS_OPTIONS = [
    { value: "all", label: "All" },
    { value: "NEW", label: "New" },
    { value: "IN_PROGRESS", label: "In Progress" },
    { value: "AWAITING_REVIEW", label: "Awaiting Review" },
    { value: "CLOSED", label: "Closed" }
];
function formatDirection(direction) {
    return direction === "INCOMING" ? "Incoming" : "Outgoing";
}
function formatStatus(status) {
    return status
        .split("_")
        .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
        .join(" ");
}
export function ReceptionistDashboardPage(props) {
    const { currentUser } = props;
    const [direction, setDirection] = useState("all");
    const [status, setStatus] = useState("all");
    const [query, setQuery] = useState("");
    const [records, setRecords] = useState([]);
    const [branches, setBranches] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    useEffect(() => {
        let active = true;
        async function loadDashboard() {
            try {
                setLoading(true);
                setError(null);
                const correspondencePromise = hasRole(currentUser, "ADMIN")
                    ? runtimeHostAdapter.correspondences.findAll()
                    : runtimeHostAdapter.correspondences.findByBranch(currentUser.branchId);
                const [loadedCorrespondences, loadedBranches, loadedDepartments] = await Promise.all([
                    correspondencePromise,
                    runtimeHostAdapter.branches.findAll(),
                    runtimeHostAdapter.departments.findAll()
                ]);
                if (!active) {
                    return;
                }
                setRecords(loadedCorrespondences);
                setBranches(loadedBranches);
                setDepartments(loadedDepartments);
            }
            catch (loadError) {
                if (!active) {
                    return;
                }
                setError(loadError instanceof Error ? loadError.message : "Unable to load the receptionist dashboard.");
            }
            finally {
                if (active) {
                    setLoading(false);
                }
            }
        }
        void loadDashboard();
        return () => {
            active = false;
        };
    }, [currentUser]);
    const rows = useMemo(() => {
        const branchById = new Map(branches.map((item) => [item.id, item]));
        const departmentById = new Map(departments.map((item) => [item.id, item]));
        return [...records]
            .sort((left, right) => right.receivedDate.localeCompare(left.receivedDate))
            .filter((item) => (direction === "all" ? true : item.direction === direction))
            .filter((item) => (status === "all" ? true : item.status === status))
            .filter((item) => {
            const target = `${item.reference} ${item.subject}`.toLowerCase();
            return target.includes(query.trim().toLowerCase());
        })
            .map((item) => ({
            ...item,
            branchName: branchById.get(item.branchId)?.code ?? item.branchId,
            departmentName: item.departmentId
                ? departmentById.get(item.departmentId)?.code ?? item.departmentId
                : "Unassigned"
        }));
    }, [branches, departments, direction, query, records, status]);
    return (_jsx(Container, { size: "xl", py: "lg", children: _jsxs(Stack, { gap: "lg", children: [_jsxs(Group, { justify: "space-between", align: "end", children: [_jsxs("div", { children: [_jsx(Title, { order: 2, children: "Receptionist Dashboard" }), _jsx(Text, { c: "dimmed", size: "sm", children: "Live correspondence queue and quick registration actions." })] }), _jsxs(Group, { gap: "xs", children: [_jsx(Button, { variant: "light", color: "blue", onClick: () => navigate("/receptionist/new?direction=INCOMING"), children: "New Incoming" }), _jsx(Button, { color: "dark", onClick: () => navigate("/receptionist/new?direction=OUTGOING"), children: "New Outgoing" })] })] }), error && (_jsx(Alert, { color: "red", title: "Dashboard Load Failed", children: error })), _jsx(Card, { withBorder: true, radius: "md", p: "md", children: _jsxs(Group, { grow: true, children: [_jsx(Select, { label: "Direction", value: direction, onChange: setDirection, data: DIRECTION_OPTIONS }), _jsx(Select, { label: "Status", value: status, onChange: setStatus, data: STATUS_OPTIONS }), _jsx(TextInput, { label: "Search", placeholder: "Reference or subject", value: query, onChange: (event) => setQuery(event.currentTarget.value) })] }) }), _jsxs(Card, { withBorder: true, radius: "md", p: "md", children: [loading && (_jsx(Group, { justify: "center", py: "xl", children: _jsx(Loader, { size: "sm" }) })), _jsx(Table.ScrollContainer, { minWidth: 960, children: _jsxs(Table, { striped: true, highlightOnHover: true, verticalSpacing: "sm", children: [_jsx(Table.Thead, { children: _jsxs(Table.Tr, { children: [_jsx(Table.Th, { children: "Reference" }), _jsx(Table.Th, { children: "Subject" }), _jsx(Table.Th, { children: "Direction" }), _jsx(Table.Th, { children: "Branch" }), _jsx(Table.Th, { children: "Department" }), _jsx(Table.Th, { children: "Status" }), _jsx(Table.Th, { children: "Due Date" })] }) }), _jsx(Table.Tbody, { children: rows.map((row) => (_jsxs(Table.Tr, { children: [_jsx(Table.Td, { children: row.reference }), _jsx(Table.Td, { children: row.subject }), _jsx(Table.Td, { children: formatDirection(row.direction) }), _jsx(Table.Td, { children: row.branchName }), _jsx(Table.Td, { children: row.departmentName }), _jsx(Table.Td, { children: _jsx(Badge, { variant: "light", children: formatStatus(row.status) }) }), _jsx(Table.Td, { children: row.dueDate ?? "-" })] }, row.id))) })] }) }), !loading && rows.length === 0 && _jsx(Text, { c: "dimmed", size: "sm", children: "No correspondence matched your filters." })] })] }) }));
}
