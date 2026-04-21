import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Alert, Button, Card, Container, FileInput, Group, Select, Stack, Text, TextInput, Textarea, Title } from "@mantine/core";
export function TakeActionPage() {
    const [status, setStatus] = useState("In Progress");
    const [deadline, setDeadline] = useState("2026-04-24");
    const [comment, setComment] = useState("");
    const [file, setFile] = useState(null);
    const [message, setMessage] = useState(null);
    function handleUpdate() {
        setMessage(`Action updated with status ${status ?? "Unknown"}, deadline ${deadline}, comment length ${comment.length}, file ${file?.name ?? "none"}.`);
    }
    return (_jsx(Container, { size: "md", py: "lg", children: _jsxs(Stack, { gap: "lg", children: [_jsxs("div", { children: [_jsx(Title, { order: 2, children: "Take Action" }), _jsx(Text, { c: "dimmed", size: "sm", children: "Update deadline, status, comments, and attach supporting files." })] }), _jsx(Card, { withBorder: true, radius: "md", p: "md", children: _jsxs(Stack, { gap: "md", children: [_jsx(Select, { label: "Task status", value: status, onChange: setStatus, data: [
                                    { value: "Assigned", label: "Assigned" },
                                    { value: "In Progress", label: "In Progress" },
                                    { value: "Blocked", label: "Blocked" },
                                    { value: "Completed", label: "Completed" }
                                ] }), _jsx(TextInput, { label: "Deadline", type: "date", value: deadline, onChange: (event) => setDeadline(event.currentTarget.value) }), _jsx(Textarea, { label: "Action comment", minRows: 4, placeholder: "Describe what was done, blockers, and next step", value: comment, onChange: (event) => setComment(event.currentTarget.value) }), _jsx(FileInput, { label: "Upload file", placeholder: "Attach evidence or response file", value: file, onChange: setFile, clearable: true }), _jsx(Group, { justify: "flex-end", children: _jsx(Button, { onClick: handleUpdate, children: "Save Update" }) })] }) }), message && (_jsx(Alert, { color: "green", title: "Update saved", children: message }))] }) }));
}
