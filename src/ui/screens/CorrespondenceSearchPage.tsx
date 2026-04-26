import { useEffect, useMemo, useState } from "react";
import { Anchor, Badge, Button, Card, Container, Drawer, Group, Menu, Select, Stack, Table, Text, TextInput, Title } from "@mantine/core";
import { useSearchParams } from "react-router-dom";
import type { Correspondence } from "../../domain/correspondence";
import type { AppUser, Branch, Department } from "../../domain/governance";
import { hasRole } from "../../application/services/accessControl";
import { runtimeHostAdapter } from "../../platform/runtimeHostAdapter";
import { CorrespondenceDetailsDrawerContainer } from "../components/CorrespondenceDetailsDrawerContainer";
import { TaskAssignationPage } from "./TaskAssignationPage";
import { TakeActionPage } from "./TakeActionPage";

function formatDate(value: Date | undefined): string {
  if (!value) {
    return "-";
  }

  return value.toISOString().slice(0, 10);
}

export function CorrespondenceSearchPage(props: { currentUser: AppUser }): JSX.Element {
  const { currentUser } = props;
  const [searchParams] = useSearchParams();
  const requestedCorrespondenceId = searchParams.get("correspondenceId");
  const requestedReference = searchParams.get("reference");
  const [reference, setReference] = useState("");
  const [subject, setSubject] = useState("");
  const [branch, setBranch] = useState<string | null>("all");
  const [status, setStatus] = useState<string | null>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [records, setRecords] = useState<Correspondence[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [assignedCorrespondenceIds, setAssignedCorrespondenceIds] = useState<Set<string>>(new Set());
  const [assignDrawerOpened, setAssignDrawerOpened] = useState(false);
  const [assignCorrespondenceId, setAssignCorrespondenceId] = useState<string | null>(null);
  const [takeActionDrawerOpened, setTakeActionDrawerOpened] = useState(false);
  const [takeActionCorrespondenceId, setTakeActionCorrespondenceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!requestedReference) {
      return;
    }

    setReference(requestedReference);
  }, [requestedReference]);

  useEffect(() => {
    let active = true;

    async function loadData(): Promise<void> {
      try {
        setError(null);
        const [loadedRecords, loadedBranches, loadedDepartments, loadedUsers, loadedTaskAssignments] = await Promise.all([
          runtimeHostAdapter.correspondences.findAll(),
          runtimeHostAdapter.branches.findAll(),
          runtimeHostAdapter.departments.findAll(),
          runtimeHostAdapter.users.findAll(),
          runtimeHostAdapter.taskAssignments.findByAssignee(currentUser.id)
        ]);

        if (!active) {
          return;
        }

        setRecords(loadedRecords);
        setBranches(loadedBranches);
        setDepartments(loadedDepartments);
        setUsers(loadedUsers);
        setAssignedCorrespondenceIds(new Set(loadedTaskAssignments.map((t) => t.correspondenceId)));
      } catch (loadError) {
        if (!active) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "Unable to load correspondence records.");
      }
    }

    void loadData();

    return () => {
      active = false;
    };
  }, []);

  const rows = useMemo(() => {
    const branchById = new Map(branches.map((item) => [item.id, item]));
    const departmentById = new Map(departments.map((item) => [item.id, item]));
    const userById = new Map(users.map((item) => [item.id, item]));

    return records
      .filter((item) => {
        if (hasRole(currentUser, "ADMIN") || hasRole(currentUser, "EXECUTIVE")) {
          return true;
        }

        return item.recipientId === currentUser.id || item.actionOwnerId === currentUser.id || assignedCorrespondenceIds.has(item.id);
      })
      .filter((item) => (branch === "all" ? true : item.branchId === branch))
      .filter((item) => (status === "all" ? true : item.status === status))
      .filter((item) => (item.reference ?? "").toLowerCase().includes(reference.trim().toLowerCase()))
      .filter((item) => (item.subject ?? "").toLowerCase().includes(subject.trim().toLowerCase()))
      .map((item) => ({
        ...item,
        branchName: branchById.get(item.branchId)?.code ?? item.branchId,
        departmentName: item.departmentId
          ? departmentById.get(item.departmentId)?.code ?? item.departmentId
          : "Unassigned",
        receptionistName: userById.get(item.registeredById)?.fullName ?? item.registeredById,
        recipientName: item.recipientId
          ? userById.get(item.recipientId)?.fullName ?? item.recipientId
          : "Unassigned",
        actionOwnerName: item.actionOwnerId
          ? userById.get(item.actionOwnerId)?.fullName ?? item.actionOwnerId
          : "Unassigned"
      }));
  }, [assignedCorrespondenceIds, branch, branches, currentUser, departments, records, reference, status, subject, users]);

  useEffect(() => {
    if (!requestedCorrespondenceId) {
      return;
    }

    const match = rows.find((item) => item.id === requestedCorrespondenceId);
    if (match) {
      setSelectedId(match.id);
    }
  }, [requestedCorrespondenceId, rows]);

  const selectedCorrespondence = useMemo(
    () => rows.find((item) => item.id === selectedId) ?? null,
    [rows, selectedId]
  );

  const isRecipient = hasRole(currentUser, "RECIPIENT") || hasRole(currentUser, "ADMIN");

  const handleRefresh = async (): Promise<void> => {
    try {
      const [loadedRecords, loadedTaskAssignments] = await Promise.all([
        runtimeHostAdapter.correspondences.findAll(),
        runtimeHostAdapter.taskAssignments.findByAssignee(currentUser.id)
      ]);
      setRecords(loadedRecords);
      setAssignedCorrespondenceIds(new Set(loadedTaskAssignments.map((t) => t.correspondenceId)));
    } catch {
      // Non-fatal
    }
  };

  return (
    <Container size="xl" py="lg">
      <Stack gap="lg">
        <div>
          <Title order={2}>Correspondence Search</Title>
          <Text c="dimmed" size="sm">Search correspondence across the organization with multi-criteria filters.</Text>
        </div>

        {error && <Text c="red" size="sm">{error}</Text>}

        <Card withBorder radius="md" p="md">
          <Group grow>
            <TextInput
              label="Reference"
              placeholder="BANK-HQ-..."
              value={reference}
              onChange={(event) => setReference(event.currentTarget.value)}
            />
            <TextInput
              label="Subject"
              placeholder="Keywords"
              value={subject}
              onChange={(event) => setSubject(event.currentTarget.value)}
            />
            <Select
              label="Branch"
              value={branch}
              onChange={setBranch}
              data={[{ value: "all", label: "All" }, ...branches.map((item) => ({ value: item.id, label: item.code }))]}
            />
            <Select
              label="Status"
              value={status}
              onChange={setStatus}
              data={[
                { value: "all", label: "All" },
                { value: "NEW", label: "New" },
                { value: "IN_PROGRESS", label: "In Progress" },
                { value: "AWAITING_REVIEW", label: "Awaiting Review" },
                { value: "CLOSED", label: "Closed" }
              ]}
            />
          </Group>
        </Card>

        <Card withBorder radius="md" p="md">
          <Group justify="space-between" mb="sm">
            <Title order={4}>Search Results</Title>
            <Badge variant="light">{rows.length} items</Badge>
          </Group>
          {error && <Text c="red" size="sm" mb="sm">{error}</Text>}
          <Table.ScrollContainer minWidth={980}>
            <Table striped highlightOnHover verticalSpacing="xs">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Reference</Table.Th>
                  <Table.Th>Organisation</Table.Th>
                  <Table.Th>Subject</Table.Th>
                  <Table.Th>Date</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Action</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rows.map((row) => (
                  <Table.Tr key={row.id}>
                    <Table.Td>
                      <Anchor
                        component="button"
                        type="button"
                        onClick={() => setSelectedId(row.id)}
                        aria-label={`Open details for ${row.senderReference?.trim() || row.reference?.trim() || "-"}`}
                        size="sm"
                      >
                        {row.senderReference?.trim() || "-"}
                      </Anchor>
                    </Table.Td>
                    <Table.Td><Text size="sm">{row.organisation ?? "-"}</Text></Table.Td>
                    <Table.Td><Text size="sm">{row.subject}</Text></Table.Td>
                    <Table.Td><Text size="sm">{formatDate(row.correspondenceDate)}</Text></Table.Td>
                    <Table.Td><Text size="sm">{row.status}</Text></Table.Td>
                    <Table.Td>
                      <Menu shadow="md" width={220}>
                        <Menu.Target>
                          <Button variant="light" size="xs">...</Button>
                        </Menu.Target>
                        <Menu.Dropdown>
                          {isRecipient && row.status !== "CLOSED" && row.status !== "CANCELLED" && (
                            <Menu.Item onClick={() => {
                              setAssignCorrespondenceId(row.id);
                              setAssignDrawerOpened(true);
                            }}>
                              Assign Task
                            </Menu.Item>
                          )}
                          {isRecipient && row.status !== "CLOSED" && row.status !== "CANCELLED" && (
                            <Menu.Item onClick={() => {
                              setTakeActionCorrespondenceId(row.id);
                              setTakeActionDrawerOpened(true);
                            }}>
                              Take Action
                            </Menu.Item>
                          )}
                          {isRecipient && (row.status === "CLOSED" || row.status === "CANCELLED") && (
                            <Menu.Item disabled>No actions available for closed or cancelled correspondence</Menu.Item>
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
          {rows.length === 0 && <Text c="dimmed" size="sm">No correspondence found.</Text>}
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
            onAssignmentCreated={handleRefresh}
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
            onActionUpdated={handleRefresh}
          />
        </Drawer>
      </Stack>
    </Container>
  );
}
