import { useMemo, useState } from "react";
import { Card, Container, Group, Select, Stack, Table, Text, Title } from "@mantine/core";
import { correspondences } from "../mocks/uiData";

const WEEK_START = "2026-04-14";

export function ReceptionistHistoryPage(): JSX.Element {
  const [window, setWindow] = useState<string | null>("week");
  const [branch, setBranch] = useState<string | null>("all");
  const [receptionist, setReceptionist] = useState<string | null>("all");

  const rows = useMemo(() => {
    return correspondences
      .filter((item) => (window === "week" ? item.receivedDate >= WEEK_START : true))
      .filter((item) => (branch === "all" ? true : item.branch === branch))
      .filter((item) => (receptionist === "all" ? true : item.receptionist === receptionist));
  }, [window, branch, receptionist]);

  return (
    <Container size="xl" py="lg">
      <Stack gap="lg">
        <div>
          <Title order={2}>Receptionist Correspondence History</Title>
          <Text c="dimmed" size="sm">Week view by default, expandable to full history with branch and receptionist filters.</Text>
        </div>

        <Card withBorder radius="md" p="md">
          <Group grow>
            <Select
              label="Time Range"
              value={window}
              onChange={setWindow}
              data={[
                { value: "week", label: "Current Week" },
                { value: "all", label: "All Time" }
              ]}
            />
            <Select
              label="Branch"
              value={branch}
              onChange={setBranch}
              data={[
                { value: "all", label: "All Branches" },
                { value: "HQ", label: "HQ" },
                { value: "BRN-02", label: "BRN-02" }
              ]}
            />
            <Select
              label="Receptionist"
              value={receptionist}
              onChange={setReceptionist}
              data={[
                { value: "all", label: "All Receptionists" },
                { value: "Reception User", label: "Reception User" }
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
                  <Table.Th>Branch</Table.Th>
                  <Table.Th>Department</Table.Th>
                  <Table.Th>Receptionist</Table.Th>
                  <Table.Th>Status</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rows.map((row) => (
                  <Table.Tr key={row.id}>
                    <Table.Td>{row.receivedDate}</Table.Td>
                    <Table.Td>{row.reference}</Table.Td>
                    <Table.Td>{row.subject}</Table.Td>
                    <Table.Td>{row.branch}</Table.Td>
                    <Table.Td>{row.department}</Table.Td>
                    <Table.Td>{row.receptionist}</Table.Td>
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
