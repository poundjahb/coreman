import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Paper, Text } from "@mantine/core";
export function KpiCard({ label, value, trend }) {
    return (_jsxs(Paper, { withBorder: true, radius: "md", p: "md", shadow: "xs", children: [_jsx(Text, { size: "xs", tt: "uppercase", fw: 700, c: "dimmed", mb: 4, children: label }), _jsx(Text, { size: "xl", fw: 700, c: "blue.8", style: { fontSize: "2rem" }, children: value }), _jsx(Text, { size: "sm", c: "dimmed", mt: 4, children: trend })] }));
}
