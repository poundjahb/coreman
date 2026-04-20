import { Card, Container, Group, SimpleGrid, Stack, Table, Text, Title } from "@mantine/core";
import { KpiCard } from "../components/KpiCard";

export function GeneralDashboardPage(): JSX.Element {
  return (
    <Container size="xl" py="lg">
      <Stack gap="lg">
        <div>
          <Title order={2}>General Correspondence Dashboard</Title>
          <Text c="dimmed" size="sm">Executive view of organization-wide correspondence processing performance.</Text>
        </div>

        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
          <KpiCard label="Total Processed" value="2,438" trend="This month" />
          <KpiCard label="Within SLA" value="91%" trend="+3% vs last month" />
          <KpiCard label="Avg Handling Time" value="2.1d" trend="-0.4d improvement" />
          <KpiCard label="Critical Overdue" value="7" trend="Needs escalation" />
        </SimpleGrid>

        <Card withBorder radius="md" p="md">
          <Group justify="space-between" mb="sm">
            <Title order={4}>Branch Performance Snapshot</Title>
          </Group>
          <Table.ScrollContainer minWidth={760}>
            <Table striped>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Branch</Table.Th>
                  <Table.Th>Processed</Table.Th>
                  <Table.Th>Within SLA</Table.Th>
                  <Table.Th>Overdue</Table.Th>
                  <Table.Th>Avg Days</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                <Table.Tr>
                  <Table.Td>HQ</Table.Td>
                  <Table.Td>1,420</Table.Td>
                  <Table.Td>93%</Table.Td>
                  <Table.Td>4</Table.Td>
                  <Table.Td>1.9</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td>BRN-02</Table.Td>
                  <Table.Td>1,018</Table.Td>
                  <Table.Td>89%</Table.Td>
                  <Table.Td>3</Table.Td>
                  <Table.Td>2.4</Table.Td>
                </Table.Tr>
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Card>
      </Stack>
    </Container>
  );
}
