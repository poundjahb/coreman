import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { Card, Container, Group, Select, Stack, Table, Text, Title } from "@mantine/core";
import { correspondences } from "../mocks/uiData";
const WEEK_START = "2026-04-14";
export function ReceptionistHistoryPage() {
    const [window, setWindow] = useState("week");
    const [branch, setBranch] = useState("all");
    const [receptionist, setReceptionist] = useState("all");
    const rows = useMemo(() => {
        return correspondences
            .filter((item) => (window === "week" ? item.receivedDate >= WEEK_START : true))
            .filter((item) => (branch === "all" ? true : item.branch === branch))
            .filter((item) => (receptionist === "all" ? true : item.receptionist === receptionist));
    }, [window, branch, receptionist]);
    return (_jsx(Container, { size: "xl", py: "lg", children: _jsxs(Stack, { gap: "lg", children: [_jsxs("div", { children: [_jsx(Title, { order: 2, children: "Receptionist Correspondence History" }), _jsx(Text, { c: "dimmed", size: "sm", children: "Week view by default, expandable to full history with branch and receptionist filters." })] }), _jsx(Card, { withBorder: true, radius: "md", p: "md", children: _jsxs(Group, { grow: true, children: [_jsx(Select, { label: "Time Range", value: window, onChange: setWindow, data: [
                                    { value: "week", label: "Current Week" },
                                    { value: "all", label: "All Time" }
                                ] }), _jsx(Select, { label: "Branch", value: branch, onChange: setBranch, data: [
                                    { value: "all", label: "All Branches" },
                                    { value: "HQ", label: "HQ" },
                                    { value: "BRN-02", label: "BRN-02" }
                                ] }), _jsx(Select, { label: "Receptionist", value: receptionist, onChange: setReceptionist, data: [
                                    { value: "all", label: "All Receptionists" },
                                    { value: "Reception User", label: "Reception User" }
                                ] })] }) }), _jsx(Card, { withBorder: true, radius: "md", p: "md", children: _jsx(Table.ScrollContainer, { minWidth: 980, children: _jsxs(Table, { striped: true, highlightOnHover: true, verticalSpacing: "sm", children: [_jsx(Table.Thead, { children: _jsxs(Table.Tr, { children: [_jsx(Table.Th, { children: "Date" }), _jsx(Table.Th, { children: "Reference" }), _jsx(Table.Th, { children: "Subject" }), _jsx(Table.Th, { children: "Branch" }), _jsx(Table.Th, { children: "Department" }), _jsx(Table.Th, { children: "Receptionist" }), _jsx(Table.Th, { children: "Status" })] }) }), _jsx(Table.Tbody, { children: rows.map((row) => (_jsxs(Table.Tr, { children: [_jsx(Table.Td, { children: row.receivedDate }), _jsx(Table.Td, { children: row.reference }), _jsx(Table.Td, { children: row.subject }), _jsx(Table.Td, { children: row.branch }), _jsx(Table.Td, { children: row.department }), _jsx(Table.Td, { children: row.receptionist }), _jsx(Table.Td, { children: row.status })] }, row.id))) })] }) }) })] }) }));
}
