import { useState } from "react";
import {
  Alert,
  Button,
  Card,
  Container,
  Group,
  MultiSelect,
  Stack,
  Table,
  Text,
  TextInput,
  Title
} from "@mantine/core";

interface AssignedTask {
  id: string;
  title: string;
  deadline: string;
}

export function TaskAssignationPage(): JSX.Element {
  const [taskTitle, setTaskTitle] = useState("");
  const [deadline, setDeadline] = useState("");
  const [owners, setOwners] = useState<string[]>([]);
  const [ccUsers, setCcUsers] = useState<string[]>([]);
  const [tasks, setTasks] = useState<AssignedTask[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  function addTask(): void {
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

  function submitAssignation(): void {
    if (tasks.length === 0 || owners.length === 0) {
      setMessage("Add at least one task and one assigned user before submitting.");
      return;
    }

    setMessage(`Assigned ${tasks.length} task(s) to ${owners.length} user(s). CC: ${ccUsers.length}.`);
  }

  return (
    <Container size="lg" py="lg">
      <Stack gap="lg">
        <div>
          <Title order={2}>Task Assignation</Title>
          <Text c="dimmed" size="sm">Define tasks, assign one or many users, set CC notifications, and deadlines.</Text>
        </div>

        <Card withBorder radius="md" p="md">
          <Stack gap="md">
            <TextInput
              label="Task title"
              placeholder="Prepare response letter"
              value={taskTitle}
              onChange={(event) => setTaskTitle(event.currentTarget.value)}
            />
            <Group grow>
              <TextInput
                label="Deadline"
                type="date"
                value={deadline}
                onChange={(event) => setDeadline(event.currentTarget.value)}
              />
              <Button mt={24} onClick={addTask}>
                Add Task
              </Button>
            </Group>
            <Group grow>
              <MultiSelect
                label="Assign to users"
                data={[
                  { value: "u-002", label: "Action Owner" },
                  { value: "u-003", label: "Recipient User" },
                  { value: "u-004", label: "System Administrator" }
                ]}
                value={owners}
                onChange={setOwners}
                placeholder="Select one or more assignees"
              />
              <MultiSelect
                label="CC notification users"
                data={[
                  { value: "u-001", label: "Reception User" },
                  { value: "u-005", label: "Executive Viewer" }
                ]}
                value={ccUsers}
                onChange={setCcUsers}
                placeholder="Optional"
              />
            </Group>
          </Stack>
        </Card>

        <Card withBorder radius="md" p="md">
          <Title order={4} mb="sm">Defined Tasks</Title>
          <Table.ScrollContainer minWidth={680}>
            <Table striped>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Task</Table.Th>
                  <Table.Th>Deadline</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {tasks.map((task) => (
                  <Table.Tr key={task.id}>
                    <Table.Td>{task.title}</Table.Td>
                    <Table.Td>{task.deadline}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
          {tasks.length === 0 && <Text c="dimmed" size="sm">No task defined yet.</Text>}
        </Card>

        <Group justify="flex-end">
          <Button color="dark" onClick={submitAssignation}>Submit Assignation</Button>
        </Group>

        {message && (
          <Alert color="blue" title="Assignation status">
            {message}
          </Alert>
        )}
      </Stack>
    </Container>
  );
}
