import { useEffect, useMemo, useState } from "react";
import { Anchor, Card, Container, Group, Select, Stack, Table, Text, TextInput, Title } from "@mantine/core";
import type { Correspondence } from "../../domain/correspondence";
import type { AppUser, Branch, Department } from "../../domain/governance";
import { hasRole } from "../../application/services/accessControl";
import { runtimeHostAdapter } from "../../platform/runtimeHostAdapter";
import { CorrespondenceDetailsDrawerContainer } from "../components/CorrespondenceDetailsDrawerContainer";

function toDateOnly(value: Date | undefined): string {
  if (!value) {
    return "";
  }

  return value.toISOString().slice(0, 10);
}

export function ReceptionistHistoryPage(props: { currentUser: AppUser }): JSX.Element {
  const { currentUser } = props;
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
    const departmentById = new Map(departments.map((item) => [item.id, item]));
    const userById = new Map(users.map((item) => [item.id, item]));

    return [...records]
      .sort((left, right) => right.receivedDate.getTime() - left.receivedDate.getTime())
      .filter((item) => (hasRole(currentUser, "ADMIN") ? true : item.registeredById === currentUser.id))
      .filter((item) => {
        const received = toDateOnly(item.receivedDate);
        return dateFrom ? received >= dateFrom : true;
      })
      .filter((item) => {
        const received = toDateOnly(item.receivedDate);
        return dateTo ? received <= dateTo : true;
      })
      .filter((item) => (branch === "all" ? true : item.branchId === branch))
      .filter((item) => (hasRole(currentUser, "ADMIN") && receptionist !== "all" ? item.registeredById === receptionist : true))
      .filter((item) => (direction === "all" ? true : item.direction === direction))
      .map((item) => ({
        ...item,
        createdOn: toDateOnly(item.createdAt),
        organisationName: item.organisation?.trim() || "-",
        senderName: item.fromTo?.trim() || "-",
        recipientName: item.recipientId
          ? userById.get(item.recipientId)?.fullName ?? item.recipientId
          : "Unassigned",
        departmentTargetName: (() => {
          if (!item.recipientId) {
            return "-";
          }

          const recipientDepartmentId = userById.get(item.recipientId)?.departmentId;
          if (!recipientDepartmentId) {
            return "-";
          }

          return departmentById.get(recipientDepartmentId)?.code ?? recipientDepartmentId;
        })()
      }));
  }, [branches, currentUser, dateFrom, dateTo, departments, direction, branch, records, receptionist, users]);

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
              disabled={!hasRole(currentUser, "ADMIN")}
              data={[
                { value: "all", label: "All Receptionists" },
                ...users.map((item) => ({ value: item.id, label: item.fullName }))
              ]}
            />
          </Group>
        </Card>

        <Card withBorder radius="md" p="md">
          <Table.ScrollContainer minWidth={960}>
            <Table striped highlightOnHover verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Date</Table.Th>
                  <Table.Th>Organisation</Table.Th>
                  <Table.Th>Sender</Table.Th>
                  <Table.Th>Reference</Table.Th>
                  <Table.Th>Subject</Table.Th>
                  <Table.Th>Recipient</Table.Th>
                  <Table.Th>Department</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rows.map((row) => (
                  <Table.Tr key={row.id}>
                    <Table.Td>{row.createdOn}</Table.Td>
                    <Table.Td>{row.organisationName}</Table.Td>
                    <Table.Td>{row.senderName}</Table.Td>
                    <Table.Td>
                      <Anchor component="button" type="button" onClick={() => setSelectedId(row.id)}>
                        {row.senderReference ?? "-"}
                      </Anchor>
                    </Table.Td>
                    <Table.Td>{row.subject}</Table.Td>
                    <Table.Td>{row.recipientName}</Table.Td>
                    <Table.Td>{row.departmentTargetName}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
          {rows.length === 0 && <Text c="dimmed" size="sm">No correspondence matched your filters.</Text>}
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
