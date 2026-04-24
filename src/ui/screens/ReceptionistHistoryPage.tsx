import { useEffect, useMemo, useState } from "react";
import { Anchor } from "@mantine/core";
import { Badge, Card, Container, Group, Select, Stack, Table, Text, TextInput, Title } from "@mantine/core";
import type { Correspondence } from "../../domain/correspondence";
import type { AppUser, Branch, Department } from "../../domain/governance";
import { runtimeHostAdapter } from "../../platform/runtimeHostAdapter";
import { CorrespondenceDetailsDrawerContainer } from "../components/CorrespondenceDetailsDrawerContainer";

function toDateOnly(value: Date | undefined): string {
  if (!value) {
    return "";
  }

  return value.toISOString().slice(0, 10);
}

function formatDirection(direction: Correspondence["direction"]): string {
  return direction === "INCOMING" ? "Incoming" : "Outgoing";
}

export function ReceptionistHistoryPage(): JSX.Element {
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [branch, setBranch] = useState<string | null>("all");
  const [receptionist, setReceptionist] = useState<string | null>("all");
  const [direction, setDirection] = useState<string | null>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [records, setRecords] = useState<Correspondence[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadHistory(): Promise<void> {
      try {
        setError(null);
        const [loadedRecords, loadedBranches, loadedDepartments, loadedUsers] = await Promise.all([
          runtimeHostAdapter.correspondences.findAll(),
          runtimeHostAdapter.branches.findAll(),
          runtimeHostAdapter.departments.findAll(),
          runtimeHostAdapter.users.findAll()
        ]);

        if (!active) {
          return;
        }

        setRecords(loadedRecords);
        setBranches(loadedBranches);
        setDepartments(loadedDepartments);
        setUsers(loadedUsers);
      } catch (loadError) {
        if (!active) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "Unable to load history.");
      }
    }

    void loadHistory();

    return () => {
      active = false;
    };
  }, []);

  const rows = useMemo(() => {
    const branchById = new Map(branches.map((item) => [item.id, item]));
    const departmentById = new Map(departments.map((item) => [item.id, item]));
    const userById = new Map(users.map((item) => [item.id, item]));

    return [...records]
      .filter((item) => {
        const received = toDateOnly(item.receivedDate);
        return dateFrom ? received >= dateFrom : true;
      })
      .filter((item) => {
        const received = toDateOnly(item.receivedDate);
        return dateTo ? received <= dateTo : true;
      })
      .filter((item) => (branch === "all" ? true : item.branchId === branch))
      .filter((item) => (receptionist === "all" ? true : item.registeredById === receptionist))
      .filter((item) => (direction === "all" ? true : item.direction === direction))
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
  }, [branches, dateFrom, dateTo, departments, direction, branch, records, receptionist, users]);

  const selectedCorrespondence = useMemo(
    () => rows.find((item) => item.id === selectedId) ?? null,
    [rows, selectedId]
  );

  return (
    <Container size="xl" py="lg">
      <Stack gap="lg">
        <div>
          <Title order={2}>Receptionist Correspondence History</Title>
          <Text c="dimmed" size="sm">Filter by date range, branch, direction, and receptionist.</Text>
        </div>

        {error && <Text c="red" size="sm">{error}</Text>}

        <Card withBorder radius="md" p="md">
          <Group grow>
            <TextInput
              label="Date From"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.currentTarget.value)}
            />
            <TextInput
              label="Date To"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.currentTarget.value)}
            />
            <Select
              label="Direction"
              value={direction}
              onChange={setDirection}
              data={[
                { value: "all", label: "All Directions" },
                { value: "INCOMING", label: "Incoming" },
                { value: "OUTGOING", label: "Outgoing" }
              ]}
            />
            <Select
              label="Branch"
              value={branch}
              onChange={setBranch}
              data={[{ value: "all", label: "All Branches" }, ...branches.map((item) => ({ value: item.id, label: item.code }))]}
            />
            <Select
              label="Receptionist"
              value={receptionist}
              onChange={setReceptionist}
              data={[
                { value: "all", label: "All Receptionists" },
                ...users.map((item) => ({ value: item.id, label: item.fullName }))
              ]}
            />
          </Group>
        </Card>

        <Card withBorder radius="md" p="md">
          <Table.ScrollContainer minWidth={980}>
            <Table striped highlightOnHover verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Date</Table.Th>
                  <Table.Th>Reference</Table.Th>
                  <Table.Th>Subject</Table.Th>
                  <Table.Th>Direction</Table.Th>
                  <Table.Th>Branch</Table.Th>
                  <Table.Th>Department</Table.Th>
                  <Table.Th>Receptionist</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rows.map((row) => (
                  <Table.Tr key={row.id}>
                    <Table.Td>{toDateOnly(row.receivedDate)}</Table.Td>
                    <Table.Td>
                      <Anchor component="button" type="button" onClick={() => setSelectedId(row.id)}>
                        {row.reference}
                      </Anchor>
                    </Table.Td>
                    <Table.Td>{row.subject}</Table.Td>
                    <Table.Td>
                      <Badge color={row.direction === "INCOMING" ? "blue" : "teal"} variant="light">
                        {formatDirection(row.direction)}
                      </Badge>
                    </Table.Td>
                    <Table.Td>{row.branchName}</Table.Td>
                    <Table.Td>{row.departmentName}</Table.Td>
                    <Table.Td>{row.receptionistName}</Table.Td>
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
      </Stack>
    </Container>
  );
}
