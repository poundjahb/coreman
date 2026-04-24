import { useEffect, useMemo, useState } from "react";
import {
  Anchor,
  Alert,
  Badge,
  Button,
  Card,
  Container,
  Loader,
  Group,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title
} from "@mantine/core";
import { useNavigate } from "react-router-dom";
import type { Correspondence } from "../../domain/correspondence";
import type { AppUser, Branch, Department } from "../../domain/governance";
import { hasRole } from "../../application/services/accessControl";
import { runtimeHostAdapter } from "../../platform/runtimeHostAdapter";
import { CorrespondenceDetailsDrawer } from "../components/CorrespondenceDetailsDrawer";

const DIRECTION_OPTIONS = [
  { value: "all", label: "All" },
  { value: "INCOMING", label: "Incoming" },
  { value: "OUTGOING", label: "Outgoing" }
];

function formatDirection(direction: Correspondence["direction"]): string {
  return direction === "INCOMING" ? "Incoming" : "Outgoing";
}

function formatDate(value: Date | undefined): string {
  if (!value) {
    return "-";
  }

  return value.toISOString().slice(0, 10);
}

export function ReceptionistDashboardPage(props: { currentUser: AppUser }): JSX.Element {
  const { currentUser } = props;
  const [direction, setDirection] = useState<string | null>("all");
  const [query, setQuery] = useState("");
  const [records, setRecords] = useState<Correspondence[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    async function loadDashboard(): Promise<void> {
      try {
        setLoading(true);
        setError(null);

        const correspondencePromise = hasRole(currentUser, "ADMIN")
          ? runtimeHostAdapter.correspondences.findAll()
          : runtimeHostAdapter.correspondences.findByBranch(currentUser.branchId);

        const [loadedCorrespondences, loadedDepartments, loadedUsers] = await Promise.all([
          correspondencePromise,
          runtimeHostAdapter.departments.findAll(),
          runtimeHostAdapter.users.findAll()
        ]);

        if (!active) {
          return;
        }

        setRecords(loadedCorrespondences);
        setDepartments(loadedDepartments);
        setUsers(loadedUsers);
      } catch (loadError) {
        if (!active) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "Unable to load the receptionist dashboard.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      active = false;
    };
  }, [currentUser]);

  const rows = useMemo(() => {
    const departmentById = new Map(departments.map((item) => [item.id, item]));
    const userById = new Map(users.map((item) => [item.id, item]));

    return [...records]
      .sort((left, right) => right.receivedDate.getTime() - left.receivedDate.getTime())
      .filter((item) => (direction === "all" ? true : item.direction === direction))
      .filter((item) => {
        const target = `${item.reference} ${item.senderReference ?? ""} ${item.subject}`.toLowerCase();
        return target.includes(query.trim().toLowerCase());
      })
      .map((item) => ({
        ...item,
        departmentName: item.departmentId
          ? departmentById.get(item.departmentId)?.code ?? item.departmentId
          : "Unassigned",
        recipientName: item.recipientId
          ? userById.get(item.recipientId)?.fullName ?? item.recipientId
          : "Unassigned"
      }));
  }, [departments, direction, query, records, users]);

  const selectedCorrespondence = useMemo(
    () => rows.find((item) => item.id === selectedId) ?? null,
    [rows, selectedId]
  );

  return (
    <Container size="xl" py="lg">
      <Stack gap="lg">
        <Group justify="space-between" align="end">
          <div>
            <Title order={2}>Receptionist Dashboard</Title>
            <Text c="dimmed" size="sm">Live correspondence queue and quick registration actions.</Text>
          </div>
          <Group gap="xs">
            <Button variant="light" color="blue" onClick={() => navigate("/receptionist/new?direction=INCOMING")}>New Incoming</Button>
            <Button color="dark" onClick={() => navigate("/receptionist/new?direction=OUTGOING")}>New Outgoing</Button>
          </Group>
        </Group>

        {error && (
          <Alert color="red" title="Dashboard Load Failed">
            {error}
          </Alert>
        )}

        <Card withBorder radius="md" p="md">
          <Group grow>
            <Select
              label="Type"
              value={direction}
              onChange={setDirection}
              data={DIRECTION_OPTIONS}
            />
            <TextInput
              label="Search"
              placeholder="Reference, sender reference or subject"
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
            />
          </Group>
        </Card>

        <Card withBorder radius="md" p="md">
          {loading && (
            <Group justify="center" py="xl">
              <Loader size="sm" />
            </Group>
          )}
          <Table.ScrollContainer minWidth={960}>
            <Table striped highlightOnHover verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Reference</Table.Th>
                 
                  <Table.Th>Subject</Table.Th>
                  <Table.Th>Type</Table.Th>
                  <Table.Th>Department</Table.Th>
                  <Table.Th>Recipient</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rows.map((row) => (
                  <Table.Tr key={row.id}>
                    <Table.Td>
                      <Anchor component="button" type="button" onClick={() => setSelectedId(row.id)}>
                      {row.senderReference ?? "-"}
                      </Anchor>
                    </Table.Td>
                    
                    <Table.Td>{row.subject}</Table.Td>
                    <Table.Td>{formatDirection(row.direction)}</Table.Td>
                    <Table.Td>{row.departmentName}</Table.Td>
                    <Table.Td>{row.recipientName}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
          {!loading && rows.length === 0 && <Text c="dimmed" size="sm">No correspondence matched your filters.</Text>}
        </Card>

        <CorrespondenceDetailsDrawer
          opened={Boolean(selectedCorrespondence)}
          onClose={() => setSelectedId(null)}
          reference={selectedCorrespondence?.reference ?? ""}
          subject={selectedCorrespondence?.subject ?? ""}
          direction={selectedCorrespondence ? formatDirection(selectedCorrespondence.direction) : undefined}
          fields={[
            { label: "Sender Reference", value: selectedCorrespondence?.senderReference ?? "-" },
            { label: "Received Date", value: selectedCorrespondence ? formatDate(selectedCorrespondence.receivedDate) : "" },
            { label: "Department", value: selectedCorrespondence?.departmentName ?? "" },
            { label: "Recipient", value: selectedCorrespondence?.recipientName ?? "" },
            { label: "Action Owner", value: selectedCorrespondence?.actionOwnerId ?? "" }
          ]}
        />
      </Stack>
    </Container>
  );
}
