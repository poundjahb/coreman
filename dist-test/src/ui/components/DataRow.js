import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Text } from "@mantine/core";
export function DataRow({ label, value }) {
    return (_jsxs(Box, { p: "sm", style: { border: "1px solid var(--mantine-color-gray-3)", borderRadius: 10, background: "var(--mantine-color-gray-0)" }, children: [_jsx(Text, { size: "xs", tt: "uppercase", fw: 700, c: "dimmed", style: { letterSpacing: "0.06em" }, children: label }), _jsx(Text, { fw: 600, mt: 4, ff: "monospace", children: value })] }));
}
