import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Badge, Box, Group, Stack, Text, Title } from "@mantine/core";
export function HeroHeader({ authMode, modeGuardValid, refreshedAt }) {
    return (_jsxs(Box, { style: {
            background: "linear-gradient(135deg, #10345b 0%, #0f548f 60%, #2570bd 100%)",
            borderRadius: 18,
            padding: "1.5rem",
            boxShadow: "0 20px 45px rgba(15,34,55,0.24)",
            display: "grid",
            gridTemplateColumns: "1.8fr 1fr",
            gap: "1rem"
        }, children: [_jsxs(Stack, { gap: "xs", children: [_jsx(Text, { size: "xs", fw: 700, style: {
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            color: "rgba(244,248,255,0.85)"
                        }, children: "Correspondence Operations" }), _jsx(Title, { order: 1, style: {
                            color: "#f4f8ff",
                            fontSize: "clamp(1.4rem, 2.8vw, 2.1rem)",
                            lineHeight: 1.2
                        }, children: "Enterprise Correspondence Control Center" }), _jsx(Text, { style: { color: "rgba(244,248,255,0.9)", maxWidth: "62ch" }, children: "Monitor workflows, enforce governance, and keep branch communications moving with clear accountability." })] }), _jsxs(Box, { style: {
                    alignSelf: "center",
                    background: "rgba(255,255,255,0.14)",
                    border: "1px solid rgba(255,255,255,0.28)",
                    borderRadius: 14,
                    padding: "0.9rem 1rem",
                    backdropFilter: "blur(4px)"
                }, children: [_jsx(Text, { size: "xs", fw: 700, style: {
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                            color: "rgba(244,248,255,0.86)",
                            marginBottom: "0.5rem"
                        }, children: "System Posture" }), _jsxs(Stack, { gap: 6, children: [_jsxs(Text, { size: "sm", c: "#f4f8ff", children: ["Authentication: ", _jsx("strong", { children: authMode })] }), _jsxs(Group, { gap: "xs", children: [_jsx(Text, { size: "sm", c: "#f4f8ff", children: "Mode Guard:" }), _jsx(Badge, { color: modeGuardValid ? "green" : "red", size: "sm", variant: "filled", children: modeGuardValid ? "VALID" : "INVALID" })] }), _jsxs(Text, { size: "sm", c: "#f4f8ff", children: ["Refreshed: ", _jsx("strong", { children: refreshedAt.toLocaleTimeString() })] })] })] })] }));
}
