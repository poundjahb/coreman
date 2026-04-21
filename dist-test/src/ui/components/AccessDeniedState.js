import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Alert, Button, Group, Stack, Text, Title } from "@mantine/core";
import { Link } from "react-router-dom";
export function AccessDeniedState({ requiredRoles }) {
    return (_jsxs(Stack, { gap: "md", maw: 760, children: [_jsx(Title, { order: 3, children: "Access Restricted" }), _jsx(Alert, { color: "orange", title: "You are not allowed to view this page.", children: _jsxs(Text, { size: "sm", children: ["Required role(s): ", requiredRoles.join(", "), "."] }) }), _jsx(Group, { children: _jsx(Button, { component: Link, to: "/receptionist/dashboard", variant: "light", children: "Go to Receptionist Dashboard" }) })] }));
}
