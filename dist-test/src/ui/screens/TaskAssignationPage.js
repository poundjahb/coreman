import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Alert, Button, Card, Container, Group, MultiSelect, Stack, Table, Text, TextInput, Title } from "@mantine/core";
export function TaskAssignationPage() {
    const [taskTitle, setTaskTitle] = useState("");
    const [deadline, setDeadline] = useState("");
    const [owners, setOwners] = useState([]);
    const [ccUsers, setCcUsers] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [message, setMessage] = useState(null);
    function addTask() {
        if (!taskTitle.trim() || !deadline) {
            setMessage("Task title and deadline are required.");
            return;
        }
        setTasks((prev) => [
            ...prev,
            { id: `task-${prev.length + 1}`, title: taskTitle.trim(), deadline }
        ]);
        setTaskTitle("");
        setDeadline("");
        setMessage(null);
    }
    function submitAssignation() {
        if (tasks.length === 0 || owners.length === 0) {
            setMessage("Add at least one task and one assigned user before submitting.");
            return;
        }
        setMessage(`Assigned ${tasks.length} task(s) to ${owners.length} user(s). CC: ${ccUsers.length}.`);
    }
    return (_jsx(Container, { size: "lg", py: "lg", children: _jsxs(Stack, { gap: "lg", children: [_jsxs("div", { children: [_jsx(Title, { order: 2, children: "Task Assignation" }), _jsx(Text, { c: "dimmed", size: "sm", children: "Define tasks, assign one or many users, set CC notifications, and deadlines." })] }), _jsx(Card, { withBorder: true, radius: "md", p: "md", children: _jsxs(Stack, { gap: "md", children: [_jsx(TextInput, { label: "Task title", placeholder: "Prepare response letter", value: taskTitle, onChange: (event) => setTaskTitle(event.currentTarget.value) }), _jsxs(Group, { grow: true, children: [_jsx(TextInput, { label: "Deadline", type: "date", value: deadline, onChange: (event) => setDeadline(event.currentTarget.value) }), _jsx(Button, { mt: 24, onClick: addTask, children: "Add Task" })] }), _jsxs(Group, { grow: true, children: [_jsx(MultiSelect, { label: "Assign to users", data: [
                                            { value: "u-002", label: "Action Owner" },
                                            { value: "u-003", label: "Recipient User" },
                                            { value: "u-004", label: "System Administrator" }
                                        ], value: owners, onChange: setOwners, placeholder: "Select one or more assignees" }), _jsx(MultiSelect, { label: "CC notification users", data: [
                                            { value: "u-001", label: "Reception User" },
                                            { value: "u-005", label: "Executive Viewer" }
                                        ], value: ccUsers, onChange: setCcUsers, placeholder: "Optional" })] })] }) }), _jsxs(Card, { withBorder: true, radius: "md", p: "md", children: [_jsx(Title, { order: 4, mb: "sm", children: "Defined Tasks" }), _jsx(Table.ScrollContainer, { minWidth: 680, children: _jsxs(Table, { striped: true, children: [_jsx(Table.Thead, { children: _jsxs(Table.Tr, { children: [_jsx(Table.Th, { children: "Task" }), _jsx(Table.Th, { children: "Deadline" })] }) }), _jsx(Table.Tbody, { children: tasks.map((task) => (_jsxs(Table.Tr, { children: [_jsx(Table.Td, { children: task.title }), _jsx(Table.Td, { children: task.deadline })] }, task.id))) })] }) }), tasks.length === 0 && _jsx(Text, { c: "dimmed", size: "sm", children: "No task defined yet." })] }), _jsx(Group, { justify: "flex-end", children: _jsx(Button, { color: "dark", onClick: submitAssignation, children: "Submit Assignation" }) }), message && (_jsx(Alert, { color: "blue", title: "Assignation status", children: message }))] }) }));
}
