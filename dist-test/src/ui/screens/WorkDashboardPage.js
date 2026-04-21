import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from "react";
import { Badge, Button, Card, Container, Group, Menu, Progress, SimpleGrid, Stack, Table, Text, Title } from "@mantine/core";
import { Link } from "react-router-dom";
import { KpiCard } from "../components/KpiCard";
import { correspondences, tasks } from "../mocks/uiData";
import { hasRole } from "../../application/services/accessControl";
export function WorkDashboardPage({ currentUser }) {
    const pending = tasks.filter((task) => task.status !== "Completed");
    const stats = useMemo(() => {
        const completed = tasks.filter((task) => task.status === "Completed").length;
        const completion = Math.round((completed / tasks.length) * 100);
        const overdue = tasks.filter((task) => task.dueDate < "2026-04-20" && task.status !== "Completed").length;
        const escalated = tasks.filter((task) => task.status === "Blocked").length;
        return {
            completion,
            overdue,
            escalated,
            pending: pending.length
        };
    }, [pending.length]);
    const isRecipient = hasRole(currentUser, "RECIPIENT") || hasRole(currentUser, "ADMIN");
    const isActionOwner = hasRole(currentUser, "ACTION_OWNER") || hasRole(currentUser, "ADMIN");
    return (_jsx(Container, { size: "xl", py: "lg", children: _jsxs(Stack, { gap: "lg", children: [_jsxs("div", { children: [_jsx(Title, { order: 2, children: "Recipient and Action Owner Dashboard" }), _jsx(Text, { c: "dimmed", size: "sm", children: "Monitor received correspondences, pending actions, and delivery performance." })] }), _jsxs(SimpleGrid, { cols: { base: 1, sm: 2, lg: 4 }, children: [_jsx(KpiCard, { label: "Task Completion", value: `${stats.completion}%`, trend: "Across assigned tasks" }), _jsx(KpiCard, { label: "Pending Actions", value: `${stats.pending}`, trend: "Require follow-up" }), _jsx(KpiCard, { label: "Overdue", value: `${stats.overdue}`, trend: "Immediate attention" }), _jsx(KpiCard, { label: "Escalated", value: `${stats.escalated}`, trend: "Blocked or critical" })] }), _jsxs(Card, { withBorder: true, radius: "md", p: "md", children: [_jsxs(Group, { justify: "space-between", mb: "sm", children: [_jsx(Title, { order: 4, children: "Received Correspondences" }), _jsxs(Badge, { variant: "light", children: [correspondences.length, " items"] })] }), _jsx(Table.ScrollContainer, { minWidth: 980, children: _jsxs(Table, { striped: true, highlightOnHover: true, verticalSpacing: "sm", children: [_jsx(Table.Thead, { children: _jsxs(Table.Tr, { children: [_jsx(Table.Th, { children: "Reference" }), _jsx(Table.Th, { children: "Subject" }), _jsx(Table.Th, { children: "Status" }), _jsx(Table.Th, { children: "Action Owner" }), _jsx(Table.Th, { children: "Actions" })] }) }), _jsx(Table.Tbody, { children: correspondences.map((row) => (_jsxs(Table.Tr, { children: [_jsx(Table.Td, { children: row.reference }), _jsx(Table.Td, { children: row.subject }), _jsx(Table.Td, { children: row.status }), _jsx(Table.Td, { children: row.actionOwner }), _jsx(Table.Td, { children: _jsxs(Menu, { shadow: "md", width: 220, children: [_jsx(Menu.Target, { children: _jsx(Button, { variant: "light", size: "xs", children: "Open Actions" }) }), _jsxs(Menu.Dropdown, { children: [isRecipient && (_jsx(Menu.Item, { component: Link, to: "/tasks/assign", children: "Assign Task" })), isActionOwner && (_jsx(Menu.Item, { component: Link, to: "/tasks/action", children: "Take Action" })), !isRecipient && !isActionOwner && _jsx(Menu.Item, { disabled: true, children: "No available action for your role" })] })] }) })] }, row.id))) })] }) })] }), _jsxs(Card, { withBorder: true, radius: "md", p: "md", children: [_jsxs(Group, { justify: "space-between", mb: "sm", children: [_jsx(Title, { order: 4, children: "Pending Task Queue" }), _jsxs(Badge, { variant: "light", children: [pending.length, " pending"] })] }), _jsx(Table.ScrollContainer, { minWidth: 960, children: _jsxs(Table, { striped: true, highlightOnHover: true, verticalSpacing: "sm", children: [_jsx(Table.Thead, { children: _jsxs(Table.Tr, { children: [_jsx(Table.Th, { children: "Task" }), _jsx(Table.Th, { children: "Correspondence" }), _jsx(Table.Th, { children: "Owner" }), _jsx(Table.Th, { children: "Status" }), _jsx(Table.Th, { children: "Due Date" }), _jsx(Table.Th, { children: "Progress" })] }) }), _jsx(Table.Tbody, { children: pending.map((task) => (_jsxs(Table.Tr, { children: [_jsx(Table.Td, { children: task.title }), _jsx(Table.Td, { children: task.correspondenceRef }), _jsx(Table.Td, { children: task.owner }), _jsx(Table.Td, { children: task.status }), _jsx(Table.Td, { children: task.dueDate }), _jsx(Table.Td, { children: _jsx(Progress, { value: task.completion, size: "sm", radius: "xl" }) })] }, task.id))) })] }) })] })] }) }));
}
