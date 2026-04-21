import { useEffect, useMemo, useState } from "react";
import {
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

const DIRECTION_OPTIONS = [
  { value: "all", label: "All" },
  { value: "INCOMING", label: "Incoming" },
  { value: "OUTGOING", label: "Outgoing" }
];

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "NEW", label: "New" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "AWAITING_REVIEW", label: "Awaiting Review" },
  { value: "CLOSED", label: "Closed" }
];

function formatDirection(direction: Correspondence["direction"]): string {
  return direction === "INCOMING" ? "Incoming" : "Outgoing";
}

function formatStatus(status: Correspondence["status"]): string {
  return status
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

export function ReceptionistDashboardPage(props: { currentUser: AppUser }): JSX.Element {
  const { currentUser } = props;
  const [direction, setDirection] = useState<string | null>("all");
  const [status, setStatus] = useState<string | null>("all");
  const [query, setQuery] = useState("");
  const [records, setRecords] = useState<Correspondence[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

        const [loadedCorrespondences, loadedBranches, loadedDepartments] = await Promise.all([
          correspondencePromise,
          runtimeHostAdapter.branches.findAll(),
          runtimeHostAdapter.departments.findAll()
        ]);

        if (!active) {
          return;
        }

        setRecords(loadedCorrespondences);
        setBranches(loadedBranches);
        setDepartments(loadedDepartments);
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
    const branchById = new Map(branches.map((item) => [item.id, item]));
    const departmentById = new Map(departments.map((item) => [item.id, item]));

    return [...records]
      .sort((left, right) => right.receivedDate.localeCompare(left.receivedDate))
      .filter((item) => (direction === "all" ? true : item.direction === direction))
      .filter((item) => (status === "all" ? true : item.status === status))
      .filter((item) => {
        const target = `${item.reference} ${item.subject}`.toLowerCase();
        return target.includes(query.trim().toLowerCase());
      })
      .map((item) => ({
        ...item,
        branchName: branchById.get(item.branchId)?.code ?? item.branchId,
        departmentName: item.departmentId
          ? departmentById.get(item.departmentId)?.code ?? item.departmentId
          : "Unassigned"
      }));
  }, [branches, departments, direction, query, records, status]);

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
              label="Direction"
              value={direction}
              onChange={setDirection}
              data={DIRECTION_OPTIONS}
            />
            <Select
              label="Status"
              value={status}
              onChange={setStatus}
              data={STATUS_OPTIONS}
            />
            <TextInput
              label="Search"
              placeholder="Reference or subject"
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
                  <Table.Th>Direction</Table.Th>
                  <Table.Th>Branch</Table.Th>
                  <Table.Th>Department</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Due Date</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rows.map((row) => (
                  <Table.Tr key={row.id}>
                    <Table.Td>{row.reference}</Table.Td>
                    <Table.Td>{row.subject}</Table.Td>
                    <Table.Td>{formatDirection(row.direction)}</Table.Td>
                    <Table.Td>{row.branchName}</Table.Td>
                    <Table.Td>{row.departmentName}</Table.Td>
                    <Table.Td>
                      <Badge variant="light">{formatStatus(row.status)}</Badge>
                    </Table.Td>
                    <Table.Td>{row.dueDate ?? "-"}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
          {!loading && rows.length === 0 && <Text c="dimmed" size="sm">No correspondence matched your filters.</Text>}
        </Card>
      </Stack>
    </Container>
  );
}
