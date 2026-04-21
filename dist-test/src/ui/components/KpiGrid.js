import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Paper, SegmentedControl, SimpleGrid, Stack, Text } from "@mantine/core";
import { useState } from "react";
const kpiData = {
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
        { label: "Completed This Month", value: "322", trend: "Monthly cumulative" }
    ]
};
export function KpiGrid() {
    const [window, setWindow] = useState("week");
    const kpis = kpiData[window];
    return (_jsxs(Stack, { gap: "sm", children: [_jsx(Box, { style: { display: "flex", justifyContent: "flex-end" }, children: _jsx(SegmentedControl, { value: window, onChange: (val) => setWindow(val), data: [
                        { label: "Today", value: "today" },
                        { label: "This Week", value: "week" },
                        { label: "This Month", value: "month" }
                    ], radius: "xl" }) }), _jsx(SimpleGrid, { cols: { base: 1, xs: 2, sm: 4 }, spacing: "sm", children: kpis.map((kpi) => (_jsxs(Paper, { withBorder: true, radius: "md", p: "md", shadow: "sm", children: [_jsx(Text, { size: "xs", fw: 700, tt: "uppercase", style: { letterSpacing: "0.04em", color: "var(--ink-700)" }, children: kpi.label }), _jsx(Text, { fz: 32, fw: 700, mt: 8, style: { color: "var(--primary-700)" }, children: kpi.value }), _jsx(Text, { size: "sm", mt: 4, c: "dimmed", children: kpi.trend })] }, kpi.label))) })] }));
}
