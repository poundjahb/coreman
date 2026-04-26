import { useEffect, useMemo, useState } from "react";
import {
  Anchor,
  Badge,
  Button,
  Card,
  Container,
  Drawer,
  Group,
  Menu,
  Modal,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title
} from "@mantine/core";
import { KpiCard } from "../components/KpiCard";
import type { AppUser } from "../../domain/governance";
import type { Correspondence } from "../../domain/correspondence";
import type { CorrespondenceTaskAssignment } from "../../domain/correspondenceAction";
import { hasRole } from "../../application/services/accessControl";
import { runtimeHostAdapter } from "../../platform/runtimeHostAdapter";
import { CorrespondenceDetailsDrawerContainer } from "../components/CorrespondenceDetailsDrawerContainer";
import { TaskAssignationPage } from "./TaskAssignationPage";
import { TakeActionPage } from "./TakeActionPage";

interface WorkDashboardPageProps {
  currentUser: AppUser;
}

function formatDate(value: Date | undefined): string {
  if (!value) {
    return "-";
  }

  return value.toISOString().slice(0, 10);
}

function isOverdue(item: Correspondence, todayIsoDate: string): boolean {
  if (!item.dueDate || item.status === "CLOSED") {
    return false;
  }

  return item.dueDate.toISOString().slice(0, 10) < todayIsoDate;
}

export function WorkDashboardPage({ currentUser }: WorkDashboardPageProps): JSX.Element {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [assignDrawerOpened, setAssignDrawerOpened] = useState(false);
  const [assignCorrespondenceId, setAssignCorrespondenceId] = useState<string | null>(null);
  const [takeActionDrawerOpened, setTakeActionDrawerOpened] = useState(false);
  const [takeActionCorrespondenceId, setTakeActionCorrespondenceId] = useState<string | null>(null);
  const [takeActionConfirmOpened, setTakeActionConfirmOpened] = useState(false);
  const [pendingTakeActionCorrespondenceId, setPendingTakeActionCorrespondenceId] = useState<string | null>(null);
  const [records, setRecords] = useState<Correspondence[]>([]);
  const [assignedTasks, setAssignedTasks] = useState<CorrespondenceTaskAssignment[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadRecords(): Promise<void> {
      try {
        setError(null);

        // Load all correspondences and task assignments for current user
        const [all, taskAssignments] = await Promise.all([
          runtimeHostAdapter.correspondences.findAll(),
          runtimeHostAdapter.taskAssignments.findByAssignee(currentUser.id)
        ]);

        // Collect correspondence IDs assigned via task assignments
        const taskCorrespondenceIds = new Set(taskAssignments.map((t) => t.correspondenceId));

        const assignedToCurrentUser = all.filter(
          (item) =>
            item.recipientId === currentUser.id
            || item.actionOwnerId === currentUser.id
            || taskCorrespondenceIds.has(item.id)
        );

        if (!active) {
          return;
        }

        setRecords(assignedToCurrentUser);
        setAssignedTasks(taskAssignments);

      } catch (loadError) {
        if (!active) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "Unable to load correspondence records.");
      }
    }

    void loadRecords();

    return () => {
      active = false;
    };
  }, [currentUser]);

  // Filter out closed correspondences from dashboard display
  const activeRecords = useMemo(
    () => records.filter((item) => !["CLOSED", "AUTO_CLOSED", "CANCELLED"].includes(item.status)),
    [records]
  );
  const todayIsoDate = new Date().toISOString().slice(0, 10);

  const stats = useMemo(() => {
    const completedTasks = assignedTasks.filter((task) => task.status === "COMPLETED").length;
    const totalAssignedTasks = assignedTasks.length;
    const completion = totalAssignedTasks === 0 ? 0 : Math.round((completedTasks / totalAssignedTasks) * 100);
    const overdue = activeRecords.filter((item) => isOverdue(item, todayIsoDate)).length;
    const escalated = 0;
    const pending = activeRecords.filter((item) => item.status !== "CLOSED").length;

    return {
      completedTasks,
      totalAssignedTasks,
      completion,
      overdue,
      escalated,
      pending
    };
  }, [activeRecords, assignedTasks, todayIsoDate]);

  const isRecipient = hasRole(currentUser, "RECIPIENT") || hasRole(currentUser, "ADMIN");
  const selectedCorrespondence = activeRecords.find((item) => item.id === selectedId) ?? null;
  const assignedTaskCorrespondenceIds = useMemo(
    () => new Set(assignedTasks.map((task) => task.correspondenceId)),
    [assignedTasks]
  );

  function openTakeAction(correspondenceId: string): void {
    setTakeActionCorrespondenceId(correspondenceId);
    setTakeActionDrawerOpened(true);
  }

  function handleTakeActionRequest(correspondenceId: string): void {
    if (assignedTaskCorrespondenceIds.has(correspondenceId)) {
      openTakeAction(correspondenceId);
      return;
    }

    setPendingTakeActionCorrespondenceId(correspondenceId);
    setTakeActionConfirmOpened(true);
  }

  const handleAssignmentCreated = async (): Promise<void> => {
    // Refresh the correspondence list after task assignment
    try {
      setError(null);
      const [all, taskAssignments] = await Promise.all([
        runtimeHostAdapter.correspondences.findAll(),
        runtimeHostAdapter.taskAssignments.findByAssignee(currentUser.id)
      ]);
      const taskCorrespondenceIds = new Set(taskAssignments.map((t) => t.correspondenceId));
      const assignedToCurrentUser = all.filter(
        (item) =>
          item.recipientId === currentUser.id
          || item.actionOwnerId === currentUser.id
          || taskCorrespondenceIds.has(item.id)
      );
      setRecords(assignedToCurrentUser);
      setAssignedTasks(taskAssignments);
    } catch (refreshError) {
      // Non-fatal — assignment succeeded but refresh failed
      console.error("Failed to refresh correspondence list after assignment:", refreshError);
    }
  };

  return (
    <Container size="xl" py="lg">
      <Stack gap="lg">
        <div>
          <Title order={2}>My correspondences Dashboard</Title>
          <Text c="dimmed" size="sm">Monitor received correspondences, pending actions, and delivery performance.</Text>
        </div>

        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
          <KpiCard
            label="Task Completion"
            value={`${stats.completion}%`}
            trend={`${stats.completedTasks} done/${stats.totalAssignedTasks} assigned`} 
          />
          <KpiCard label="Pending Actions" value={`${stats.pending}`} trend="Require follow-up" />
          <KpiCard label="Overdue" value={`${stats.overdue}`} trend="Immediate attention" />
          <KpiCard label="Escalated" value={`${stats.escalated}`} trend="Blocked or critical" />
        </SimpleGrid>

        <Card withBorder radius="md" p="md">
          <Group justify="space-between" mb="sm">
            <Title order={4}>Received Correspondences</Title>
            <Badge variant="light">{activeRecords.length} items</Badge>
          </Group>
          {error && <Text c="red" size="sm" mb="sm">{error}</Text>}
          <Table.ScrollContainer minWidth={980}>
            <Table striped highlightOnHover verticalSpacing="xs" fz="xs">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Date</Table.Th>
                  <Table.Th>Reference</Table.Th>
                  <Table.Th>Organisation</Table.Th>
                  <Table.Th>Subject</Table.Th>
                  <Table.Th>Due Date</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Action</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {activeRecords.map((row) => (
                  <Table.Tr
                    key={row.id}
                    style={isOverdue(row, todayIsoDate) ? { backgroundColor: "var(--mantine-color-red-0)" } : undefined}
                  >
                    <Table.Td><Text size="sm">{formatDate(row.createdAt)}</Text></Table.Td>
                    <Table.Td>
                      <Anchor
                        component="button"
                        type="button"
                        onClick={() => setSelectedId(row.id)}
                        aria-label={`Open details for ${row.senderReference?.trim() || row.reference?.trim() || "-"}`}
                        size="xs"
                      >
                        {row.senderReference?.trim() || "-"}
                      </Anchor>
                    </Table.Td>
                    <Table.Td><Text size="xs">{row.organisation ?? "-"}</Text></Table.Td>
                    <Table.Td><Text size="xs">{row.subject}</Text></Table.Td>
                    <Table.Td><Text size="xs">{formatDate(row.dueDate)}</Text></Table.Td>
                    <Table.Td><Text size="xs">{row.status}</Text></Table.Td>
                    <Table.Td>
                      <Menu shadow="md" width={220}>
                        <Menu.Target>
                          <Button variant="light" size="xs">...</Button>
                        </Menu.Target>
                        <Menu.Dropdown>
                          {isRecipient && (
                            <Menu.Item onClick={() => {
                              setAssignCorrespondenceId(row.id);
                              setAssignDrawerOpened(true);
                            }}>
                              Assign Task
                            </Menu.Item>
                          )}
                          {isRecipient && (
                            <Menu.Item onClick={() => {
                              handleTakeActionRequest(row.id);
                            }}>
                              Take Action
                            </Menu.Item>
                          )}
                          {!isRecipient && <Menu.Item disabled>No available action for your role</Menu.Item>}
                        </Menu.Dropdown>
                      </Menu>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Card>

        <CorrespondenceDetailsDrawerContainer
          opened={Boolean(selectedCorrespondence)}
          onClose={() => setSelectedId(null)}
          correspondence={selectedCorrespondence}
        />

        <Drawer
          opened={assignDrawerOpened}
          onClose={() => {
            setAssignDrawerOpened(false);
            setAssignCorrespondenceId(null);
          }}
          position="right"
          size="xl"
          title="Task Assignation"
          overlayProps={{ opacity: 0.25, blur: 2 }}
        >
          <TaskAssignationPage
            correspondenceId={assignCorrespondenceId ?? undefined}
            currentUser={currentUser}
            onAssignmentCreated={handleAssignmentCreated}
          />
        </Drawer>

        <Drawer
          opened={takeActionDrawerOpened}
          onClose={() => {
            setTakeActionDrawerOpened(false);
            setTakeActionCorrespondenceId(null);
          }}
          position="right"
          size="xl"
          title="Take Action"
          overlayProps={{ opacity: 0.25, blur: 2 }}
        >
          <TakeActionPage
            correspondenceId={takeActionCorrespondenceId ?? undefined}
            currentUser={currentUser}
            onActionUpdated={handleAssignmentCreated}
          />
        </Drawer>

        <Modal
          opened={takeActionConfirmOpened}
          onClose={() => {
            setTakeActionConfirmOpened(false);
            setPendingTakeActionCorrespondenceId(null);
          }}
          title="No assigned task found"
          centered
        >
          <Stack gap="md">
            <Text size="sm">
              No task is currently assigned to you for this correspondence. Do you want to continue to the Take Action page anyway?
            </Text>
            <Group justify="flex-end">
              <Button
                variant="default"
                onClick={() => {
                  setTakeActionConfirmOpened(false);
                  setPendingTakeActionCorrespondenceId(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (pendingTakeActionCorrespondenceId) {
                    openTakeAction(pendingTakeActionCorrespondenceId);
                  }
                  setTakeActionConfirmOpened(false);
                  setPendingTakeActionCorrespondenceId(null);
                }}
              >
                Continue
              </Button>
            </Group>
          </Stack>
        </Modal>

        <Card withBorder radius="md" p="md">
          <Group justify="space-between" mb="sm">
            <Title order={4}>Pending Task Queue</Title>
            <Badge variant="light">Not yet integrated</Badge>
          </Group>
          <Text c="dimmed" size="sm">
            Action task queue is still pending backend integration. Correspondence list above is now live from the configured host adapter.
          </Text>
        </Card>
      </Stack>
    </Container>
  );
}
