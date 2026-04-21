import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { Badge, Card, Container, Group, Select, Stack, Table, Text, TextInput, Title } from "@mantine/core";
import { correspondences } from "../mocks/uiData";
export function CorrespondenceSearchPage() {
    const [reference, setReference] = useState("");
    const [subject, setSubject] = useState("");
    const [branch, setBranch] = useState("all");
    const [status, setStatus] = useState("all");
    const rows = useMemo(() => {
        return correspondences
            .filter((item) => (branch === "all" ? true : item.branch === branch))
            .filter((item) => (status === "all" ? true : item.status === status))
            .filter((item) => item.reference.toLowerCase().includes(reference.trim().toLowerCase()))
            .filter((item) => item.subject.toLowerCase().includes(subject.trim().toLowerCase()));
    }, [reference, subject, branch, status]);
    return (_jsx(Container, { size: "xl", py: "lg", children: _jsxs(Stack, { gap: "lg", children: [_jsxs("div", { children: [_jsx(Title, { order: 2, children: "Correspondence Search" }), _jsx(Text, { c: "dimmed", size: "sm", children: "Search correspondence across the organization with multi-criteria filters." })] }), _jsx(Card, { withBorder: true, radius: "md", p: "md", children: _jsxs(Group, { grow: true, children: [_jsx(TextInput, { label: "Reference", placeholder: "BANK-HQ-...", value: reference, onChange: (event) => setReference(event.currentTarget.value) }), _jsx(TextInput, { label: "Subject", placeholder: "Keywords", value: subject, onChange: (event) => setSubject(event.currentTarget.value) }), _jsx(Select, { label: "Branch", value: branch, onChange: setBranch, data: [
                                    { value: "all", label: "All" },
                                    { value: "HQ", label: "HQ" },
                                    { value: "BRN-02", label: "BRN-02" }
                                ] }), _jsx(Select, { label: "Status", value: status, onChange: setStatus, data: [
                                    { value: "all", label: "All" },
                                    { value: "New", label: "New" },
                                    { value: "In Progress", label: "In Progress" },
                                    { value: "Awaiting Review", label: "Awaiting Review" },
                                    { value: "Closed", label: "Closed" }
                                ] })] }) }), _jsxs(Card, { withBorder: true, radius: "md", p: "md", children: [_jsx(Table.ScrollContainer, { minWidth: 980, children: _jsxs(Table, { striped: true, highlightOnHover: true, children: [_jsx(Table.Thead, { children: _jsxs(Table.Tr, { children: [_jsx(Table.Th, { children: "Reference" }), _jsx(Table.Th, { children: "Subject" }), _jsx(Table.Th, { children: "Branch" }), _jsx(Table.Th, { children: "Department" }), _jsx(Table.Th, { children: "Status" }), _jsx(Table.Th, { children: "Due Date" })] }) }), _jsx(Table.Tbody, { children: rows.map((row) => (_jsxs(Table.Tr, { children: [_jsx(Table.Td, { children: row.reference }), _jsx(Table.Td, { children: row.subject }), _jsx(Table.Td, { children: row.branch }), _jsx(Table.Td, { children: row.department }), _jsx(Table.Td, { children: _jsx(Badge, { variant: "light", children: row.status }) }), _jsx(Table.Td, { children: row.dueDate })] }, row.id))) })] }) }), rows.length === 0 && _jsx(Text, { c: "dimmed", size: "sm", children: "No correspondence found." })] })] }) }));
}
