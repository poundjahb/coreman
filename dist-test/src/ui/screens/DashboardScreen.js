import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { Badge, Box, Button, Card, Container, Grid, Group, List, Paper, SimpleGrid, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import { systemConfig } from "../../config/systemConfig";
import { validateAuthMode } from "../../application/auth/modeGuard";
import { demoReferenceConfigs, demoUsers } from "../../application/modules/admin/seedData";
import { registerCorrespondence } from "../../application/modules/intake/registerCorrespondence";
import { KpiCard } from "../components/KpiCard";
import { KpiWindowSelector } from "../components/KpiWindowSelector";
import { DataRow } from "../components/DataRow";
export function DashboardScreen() {
    const [kpiWindow, setKpiWindow] = useState("week");
    const appModeCheck = validateAuthMode(systemConfig.authMode, "APP");
    const intakePreview = registerCorrespondence(demoUsers[0], {
        branchId: "b-001",
        branchCode: "HQ",
        departmentId: "d-001",
        departmentCode: "OPS",
        subject: "Incoming regulatory letter"
    }, demoReferenceConfigs, systemConfig.orgCode);
    const kpis = useMemo(() => {
        const valuesByWindow = {
            today: [
                { label: "Open Actions", value: "29", trend: "+2 today" },
                { label: "Due In 5 Days", value: "6", trend: "1 critical" },
                { label: "Escalated Cases", value: "1", trend: "stable" },
                { label: "Completed Today", value: "15", trend: "On target" }
            ],
            week: [
                { label: "Open Actions", value: "42", trend: "+6% this week" },
                { label: "Due In 5 Days", value: "8", trend: "2 high priority" },
                { label: "Escalated Cases", value: "3", trend: "-1 vs yesterday" },
                { label: "Completed Today", value: "15", trend: "On target" }
            ],
            month: [
                { label: "Open Actions", value: "188", trend: "-4% this month" },
                { label: "Due In 5 Days", value: "23", trend: "5 high priority" },
                { label: "Escalated Cases", value: "12", trend: "Within threshold" },
                { label: "Completed Today", value: "322", trend: "Monthly cumulative" }
            ]
        };
        return valuesByWindow[kpiWindow];
    }, [kpiWindow]);
    return (_jsx(Container, { size: "xl", py: "lg", children: _jsxs(Stack, { gap: "lg", children: [_jsx(Card, { radius: "lg", p: "xl", style: {
                        background: "linear-gradient(135deg, #10345b 0%, #0f548f 60%, #2570bd 100%)",
                        color: "#f4f8ff"
                    }, children: _jsxs(Grid, { align: "center", children: [_jsx(Grid.Col, { span: { base: 12, md: 8 }, children: _jsxs(Stack, { gap: "xs", children: [_jsx(Text, { size: "xs", tt: "uppercase", fw: 700, style: { letterSpacing: "0.08em", color: "rgba(244,248,255,0.85)" }, children: "Correspondence Operations" }), _jsx(Title, { order: 1, style: { color: "#f4f8ff", fontSize: "clamp(1.4rem, 2.8vw, 2.1rem)" }, children: "Enterprise Correspondence Control Center" }), _jsx(Text, { style: { color: "rgba(244,248,255,0.9)", maxWidth: "62ch" }, children: "Monitor workflows, enforce governance, and keep branch communications moving with clear accountability." })] }) }), _jsx(Grid.Col, { span: { base: 12, md: 4 }, children: _jsxs(Box, { p: "md", style: {
                                        background: "rgba(255,255,255,0.14)",
                                        border: "1px solid rgba(255,255,255,0.28)",
                                        borderRadius: 14,
                                        backdropFilter: "blur(4px)"
                                    }, children: [_jsx(Text, { size: "xs", tt: "uppercase", fw: 700, mb: "xs", style: { color: "rgba(244,248,255,0.86)", letterSpacing: "0.06em" }, children: "System Posture" }), _jsxs(Stack, { gap: 4, children: [_jsxs(Text, { size: "sm", style: { color: "#f4f8ff" }, children: ["Authentication: ", _jsx("strong", { children: systemConfig.authMode })] }), _jsxs(Text, { size: "sm", style: { color: "#f4f8ff" }, children: ["Mode Guard:", " ", _jsx(Badge, { color: appModeCheck.success ? "green" : "red", size: "xs", children: appModeCheck.success ? "VALID" : "INVALID" })] })] })] }) })] }) }), _jsx(Group, { justify: "flex-end", children: _jsx(KpiWindowSelector, { value: kpiWindow, onChange: setKpiWindow }) }), _jsx(SimpleGrid, { cols: { base: 1, xs: 2, sm: 4 }, "aria-label": "Key metrics", children: kpis.map((kpi) => (_jsx(KpiCard, { label: kpi.label, value: kpi.value, trend: kpi.trend }, kpi.label))) }), _jsxs(SimpleGrid, { cols: { base: 1, sm: 2 }, children: [_jsxs(Card, { withBorder: true, radius: "md", p: "lg", style: { gridColumn: "1 / -1" }, children: [_jsx(Title, { order: 3, mb: "xs", children: "Phase 1 Delivery Baseline" }), _jsx(Text, { c: "dimmed", mb: "xs", children: "Governance and foundational controls are in place, with secure role enforcement and mode exclusivity guards." }), _jsxs(List, { spacing: "xs", size: "sm", c: "dimmed", children: [_jsx(List.Item, { children: "Explicit user governance and role checks" }), _jsx(List.Item, { children: "APP vs ENTRA authentication mode guardrails" }), _jsx(List.Item, { children: "Configurable reference generation by scope precedence" })] })] }), _jsxs(Card, { withBorder: true, radius: "md", p: "lg", children: [_jsx(Title, { order: 3, mb: "sm", children: "Intake Preview" }), _jsxs(Stack, { gap: "xs", children: [_jsx(DataRow, { label: "Subject", value: intakePreview.subject }), _jsx(DataRow, { label: "Reference", value: intakePreview.referenceNumber }), _jsx(DataRow, { label: "Recorded By", value: intakePreview.createdBy })] })] }), _jsxs(Card, { withBorder: true, radius: "md", p: "lg", children: [_jsx(Title, { order: 3, mb: "xs", children: "Operational Highlights" }), _jsxs(List, { spacing: "xs", size: "sm", c: "dimmed", children: [_jsx(List.Item, { children: "Branch and department-specific reference patterns available" }), _jsx(List.Item, { children: "Readiness for app-triggered notification flows" }), _jsx(List.Item, { children: "Deadline monitor integration planned in next phase" })] })] }), _jsxs(Card, { withBorder: true, radius: "md", p: "lg", style: {
                                background: "linear-gradient(140deg, #fff4df, #ffffff 70%)",
                                borderColor: "#e6c791"
                            }, children: [_jsx(Title, { order: 3, mb: "xs", children: "Next Milestone" }), _jsx(Text, { c: "dimmed", mb: "md", children: "Phase 2: Dataverse persistence and app-to-flow contracts." }), _jsx(Button, { variant: "filled", color: "blue", radius: "md", size: "sm", children: "Open Implementation Board" })] })] }), _jsxs(Card, { withBorder: true, radius: "md", p: "lg", children: [_jsx(Title, { order: 3, mb: "md", children: "Execution Roadmap" }), _jsx(SimpleGrid, { cols: { base: 1, sm: 3 }, children: [
                                {
                                    phase: "Current",
                                    description: "Phase 1 complete and validated foundations in code.",
                                    color: "green"
                                },
                                {
                                    phase: "Next",
                                    description: "Phase 2 implementation with data persistence and flow triggers.",
                                    color: "blue"
                                },
                                {
                                    phase: "After",
                                    description: "SLA automation and role-restricted operational dashboards.",
                                    color: "violet"
                                }
                            ].map(({ phase, description, color }) => (_jsxs(Paper, { withBorder: true, radius: "md", p: "sm", children: [_jsxs(Group, { gap: "xs", mb: 6, children: [_jsx(ThemeIcon, { color: color, size: "xs", radius: "xl" }), _jsx(Text, { size: "xs", tt: "uppercase", fw: 700, c: color, style: { letterSpacing: "0.06em" }, children: phase })] }), _jsx(Text, { size: "sm", c: "dimmed", children: description })] }, phase))) })] })] }) }));
}
