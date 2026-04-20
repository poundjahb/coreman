import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Container,
  Group,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title
} from "@mantine/core";
import { correspondences } from "../mocks/uiData";

const TODAY = "2026-04-20";

export function ReceptionistDashboardPage(): JSX.Element {
  const [direction, setDirection] = useState<string | null>("all");
  const [status, setStatus] = useState<string | null>("all");
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    return correspondences
      .filter((item) => item.receivedDate === TODAY)
      .filter((item) => (direction === "all" ? true : item.direction === direction))
      .filter((item) => (status === "all" ? true : item.status === status))
      .filter((item) => {
        const target = `${item.reference} ${item.subject}`.toLowerCase();
        return target.includes(query.trim().toLowerCase());
      });
  }, [direction, status, query]);

  return (
    <Container size="xl" py="lg">
      <Stack gap="lg">
        <Group justify="space-between" align="end">
          <div>
            <Title order={2}>Receptionist Dashboard</Title>
            <Text c="dimmed" size="sm">Today's correspondences and quick registration actions.</Text>
          </div>
          <Group gap="xs">
            <Button variant="light" color="blue">New Incoming</Button>
            <Button color="dark">New Outgoing</Button>
          </Group>
        </Group>

        <Card withBorder radius="md" p="md">
          <Group grow>
            <Select
              label="Direction"
              value={direction}
              onChange={setDirection}
              data={[
                { value: "all", label: "All" },
                { value: "Incoming", label: "Incoming" },
                { value: "Outgoing", label: "Outgoing" }
              ]}
            />
            <Select
              label="Status"
              value={status}
              onChange={setStatus}
              data={[
                { value: "all", label: "All" },
                { value: "New", label: "New" },
                { value: "In Progress", label: "In Progress" },
                { value: "Awaiting Review", label: "Awaiting Review" },
                { value: "Closed", label: "Closed" }
              ]}
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
                    <Table.Td>{row.direction}</Table.Td>
                    <Table.Td>{row.branch}</Table.Td>
                    <Table.Td>{row.department}</Table.Td>
                    <Table.Td>
                      <Badge variant="light">{row.status}</Badge>
                    </Table.Td>
                    <Table.Td>{row.dueDate}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
          {rows.length === 0 && <Text c="dimmed" size="sm">No correspondence matched your filters.</Text>}
        </Card>
      </Stack>
    </Container>
  );
}
