import { useMemo } from "react";
import {
  Badge,
  Button,
  Card,
  Container,
  Group,
  Menu,
  Progress,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title
} from "@mantine/core";
import { Link } from "react-router-dom";
import { KpiCard } from "../components/KpiCard";
import { correspondences, tasks } from "../mocks/uiData";
import type { AppUser } from "../domain/governance";
import { hasRole } from "../services/accessControl";

interface WorkDashboardPageProps {
  currentUser: AppUser;
}

export function WorkDashboardPage({ currentUser }: WorkDashboardPageProps): JSX.Element {
  const pending = tasks.filter((task) => task.status !== "Completed");

  const stats = useMemo(() => {
    const completed = tasks.filter((task) => task.status === "Completed").length;
    const completion = Math.round((completed / tasks.length) * 100);
    const overdue = tasks.filter((task) => task.dueDate < "2026-04-20" && task.status !== "Completed").length;
    const escalated = tasks.filter((task) => task.status === "Blocked").length;

    return {
      completion,
      overdue,
      escalated,
      pending: pending.length
    };
  }, [pending.length]);

  const isRecipient = hasRole(currentUser, "RECIPIENT") || hasRole(currentUser, "ADMIN");
  const isActionOwner = hasRole(currentUser, "ACTION_OWNER") || hasRole(currentUser, "ADMIN");

  return (
    <Container size="xl" py="lg">
      <Stack gap="lg">
        <div>
          <Title order={2}>Recipient and Action Owner Dashboard</Title>
          <Text c="dimmed" size="sm">Monitor received correspondences, pending actions, and delivery performance.</Text>
        </div>

        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
          <KpiCard label="Task Completion" value={`${stats.completion}%`} trend="Across assigned tasks" />
          <KpiCard label="Pending Actions" value={`${stats.pending}`} trend="Require follow-up" />
          <KpiCard label="Overdue" value={`${stats.overdue}`} trend="Immediate attention" />
          <KpiCard label="Escalated" value={`${stats.escalated}`} trend="Blocked or critical" />
        </SimpleGrid>

        <Card withBorder radius="md" p="md">
          <Group justify="space-between" mb="sm">
            <Title order={4}>Received Correspondences</Title>
            <Badge variant="light">{correspondences.length} items</Badge>
          </Group>
          <Table.ScrollContainer minWidth={980}>
            <Table striped highlightOnHover verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Reference</Table.Th>
                  <Table.Th>Subject</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Action Owner</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {correspondences.map((row) => (
                  <Table.Tr key={row.id}>
                    <Table.Td>{row.reference}</Table.Td>
                    <Table.Td>{row.subject}</Table.Td>
                    <Table.Td>{row.status}</Table.Td>
                    <Table.Td>{row.actionOwner}</Table.Td>
                    <Table.Td>
                      <Menu shadow="md" width={220}>
                        <Menu.Target>
                          <Button variant="light" size="xs">Open Actions</Button>
                        </Menu.Target>
                        <Menu.Dropdown>
                          {isRecipient && (
                            <Menu.Item component={Link} to="/tasks/assign">
                              Assign Task
                            </Menu.Item>
                          )}
                          {isActionOwner && (
                            <Menu.Item component={Link} to="/tasks/action">
                              Take Action
                            </Menu.Item>
                          )}
                          {!isRecipient && !isActionOwner && <Menu.Item disabled>No available action for your role</Menu.Item>}
                        </Menu.Dropdown>
                      </Menu>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Card>

        <Card withBorder radius="md" p="md">
          <Group justify="space-between" mb="sm">
            <Title order={4}>Pending Task Queue</Title>
            <Badge variant="light">{pending.length} pending</Badge>
          </Group>
          <Table.ScrollContainer minWidth={960}>
            <Table striped highlightOnHover verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Task</Table.Th>
                  <Table.Th>Correspondence</Table.Th>
                  <Table.Th>Owner</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Due Date</Table.Th>
                  <Table.Th>Progress</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {pending.map((task) => (
                  <Table.Tr key={task.id}>
                    <Table.Td>{task.title}</Table.Td>
                    <Table.Td>{task.correspondenceRef}</Table.Td>
                    <Table.Td>{task.owner}</Table.Td>
                    <Table.Td>{task.status}</Table.Td>
                    <Table.Td>{task.dueDate}</Table.Td>
                    <Table.Td>
                      <Progress value={task.completion} size="sm" radius="xl" />
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Card>
      </Stack>
    </Container>
  );
}
