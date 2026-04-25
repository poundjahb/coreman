import { useEffect, useMemo, useState } from "react";
import { Anchor, Badge, Card, Container, Group, Select, Stack, Table, Text, TextInput, Title } from "@mantine/core";
import { useSearchParams } from "react-router-dom";
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

export function CorrespondenceSearchPage(): JSX.Element {
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
      .filter((item) => (branch === "all" ? true : item.branchId === branch))
      .filter((item) => (status === "all" ? true : item.status === status))
      .filter((item) => item.reference.toLowerCase().includes(reference.trim().toLowerCase()))
      .filter((item) => item.subject.toLowerCase().includes(subject.trim().toLowerCase()))
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
  }, [branch, branches, departments, records, reference, status, subject, users]);

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
          <Table.ScrollContainer minWidth={980}>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Reference</Table.Th>
                  <Table.Th>Subject</Table.Th>
                  <Table.Th>Branch</Table.Th>
                  <Table.Th>Department</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Due Date</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rows.map((row) => (
                  <Table.Tr key={row.id}>
                    <Table.Td>
                      <Anchor component="button" type="button" onClick={() => setSelectedId(row.id)}>
                        {row.reference}
                      </Anchor>
                    </Table.Td>
                    <Table.Td>{row.subject}</Table.Td>
                    <Table.Td>{row.branchName}</Table.Td>
                    <Table.Td>{row.departmentName}</Table.Td>
                    <Table.Td><Badge variant="light">{row.status}</Badge></Table.Td>
                    <Table.Td>{toDateOnly(row.dueDate)}</Table.Td>
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
      </Stack>
    </Container>
  );
}
