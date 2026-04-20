import { Card, Container, Group, Progress, SimpleGrid, Stack, Table, Text, Title } from "@mantine/core";

interface AdminPageProps {
  title: string;
  subtitle: string;
  rows: Array<{ name: string; value: string; status: string }>;
}

function AdminPageScaffold({ title, subtitle, rows }: AdminPageProps): JSX.Element {
  return (
    <Container size="xl" py="lg">
      <Stack gap="lg">
        <div>
          <Title order={2}>{title}</Title>
          <Text c="dimmed" size="sm">{subtitle}</Text>
        </div>

        <SimpleGrid cols={{ base: 1, sm: 3 }}>
          <Card withBorder radius="md" p="md">
            <Text size="sm" c="dimmed">Active Items</Text>
            <Title order={3}>{rows.length}</Title>
          </Card>
          <Card withBorder radius="md" p="md">
            <Text size="sm" c="dimmed">Healthy Ratio</Text>
            <Title order={3}>94%</Title>
          </Card>
          <Card withBorder radius="md" p="md">
            <Text size="sm" c="dimmed">Capacity</Text>
            <Progress value={72} mt="xs" />
          </Card>
        </SimpleGrid>

        <Card withBorder radius="md" p="md">
          <Group justify="space-between" mb="sm">
            <Title order={4}>Operational Data</Title>
          </Group>
          <Table.ScrollContainer minWidth={760}>
            <Table striped>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Value</Table.Th>
                  <Table.Th>Status</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rows.map((row) => (
                  <Table.Tr key={row.name}>
                    <Table.Td>{row.name}</Table.Td>
                    <Table.Td>{row.value}</Table.Td>
                    <Table.Td>{row.status}</Table.Td>
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

export function AdminUsersPage(): JSX.Element {
  return (
    <AdminPageScaffold
      title="Admin - Users"
      subtitle="Create, activate, deactivate, and manage role assignments for system users."
      rows={[
        { name: "Total Users", value: "124", status: "Stable" },
        { name: "Active Sessions", value: "38", status: "Healthy" },
        { name: "Pending Invitations", value: "6", status: "Review" }
      ]}
    />
  );
}

export function AdminDepartmentsPage(): JSX.Element {
  return (
    <AdminPageScaffold
      title="Admin - Departments"
      subtitle="Maintain organizational departments and branch-to-department mappings."
      rows={[
        { name: "Departments", value: "19", status: "Configured" },
        { name: "Branch Mappings", value: "42", status: "Healthy" },
        { name: "Unassigned Users", value: "3", status: "Attention" }
      ]}
    />
  );
}

export function AdminActionsCatalogPage(): JSX.Element {
  return (
    <AdminPageScaffold
      title="Admin - Actions Catalog"
      subtitle="Define and maintain reusable action templates for correspondence workflows."
      rows={[
        { name: "Action Templates", value: "57", status: "Available" },
        { name: "Deprecated Actions", value: "4", status: "Review" },
        { name: "Template Coverage", value: "88%", status: "Good" }
      ]}
    />
  );
}

export function AdminSystemControlPage(): JSX.Element {
  return (
    <AdminPageScaffold
      title="Admin - System Control"
      subtitle="Start and stop platform services, adjust system posture, and verify control states."
      rows={[
        { name: "Core API", value: "Running", status: "Healthy" },
        { name: "Notification Worker", value: "Running", status: "Healthy" },
        { name: "Maintenance Mode", value: "Disabled", status: "Normal" }
      ]}
    />
  );
}

export function AdminFlowAgentsPage(): JSX.Element {
  return (
    <AdminPageScaffold
      title="Admin - Flow and Connected Agents"
      subtitle="Inspect flow orchestration and connected automation agents."
      rows={[
        { name: "Active Flows", value: "14", status: "Healthy" },
        { name: "Connected Agents", value: "9", status: "Healthy" },
        { name: "Failed Triggers", value: "1", status: "Investigate" }
      ]}
    />
  );
}

export function AdminAuditLogsPage(): JSX.Element {
  return (
    <AdminPageScaffold
      title="Admin - Audit Logs"
      subtitle="Review platform events, user activities, and policy-sensitive operations."
      rows={[
        { name: "Events Today", value: "1,843", status: "Ingesting" },
        { name: "Privileged Events", value: "57", status: "Monitored" },
        { name: "Alerted Events", value: "2", status: "Review" }
      ]}
    />
  );
}

export function AdminHealthPage(): JSX.Element {
  return (
    <AdminPageScaffold
      title="Admin - System Health"
      subtitle="Monitor service health, dependency status, and environment quality indicators."
      rows={[
        { name: "CPU Usage", value: "47%", status: "Normal" },
        { name: "Memory Usage", value: "61%", status: "Normal" },
        { name: "Database Latency", value: "18 ms", status: "Healthy" }
      ]}
    />
  );
}

export function AdminPerformancePage(): JSX.Element {
  return (
    <AdminPageScaffold
      title="Admin - Performance"
      subtitle="Evaluate throughput, latency, and system efficiency over time."
      rows={[
        { name: "Average Response", value: "263 ms", status: "Good" },
        { name: "Peak Throughput", value: "122 req/s", status: "Stable" },
        { name: "Error Rate", value: "0.4%", status: "Healthy" }
      ]}
    />
  );
}
