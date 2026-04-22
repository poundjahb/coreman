import { useMemo, useState } from "react";
import { Anchor } from "@mantine/core";
import { Badge, Card, Container, Group, Select, Stack, Table, Text, TextInput, Title } from "@mantine/core";
import { correspondences } from "../mocks/uiData";
import { CorrespondenceDetailsDrawer } from "../components/CorrespondenceDetailsDrawer";

export function ReceptionistHistoryPage(): JSX.Element {
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [branch, setBranch] = useState<string | null>("all");
  const [receptionist, setReceptionist] = useState<string | null>("all");
  const [direction, setDirection] = useState<string | null>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const rows = useMemo(() => {
    return correspondences
      .filter((item) => (dateFrom ? item.receivedDate >= dateFrom : true))
      .filter((item) => (dateTo ? item.receivedDate <= dateTo : true))
      .filter((item) => (branch === "all" ? true : item.branch === branch))
      .filter((item) => (receptionist === "all" ? true : item.receptionist === receptionist))
      .filter((item) => (direction === "all" ? true : item.direction === direction));
  }, [dateFrom, dateTo, branch, receptionist, direction]);

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
                { value: "Incoming", label: "Incoming" },
                { value: "Outgoing", label: "Outgoing" }
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
                  <Table.Th>Direction</Table.Th>
                  <Table.Th>Branch</Table.Th>
                  <Table.Th>Department</Table.Th>
                  <Table.Th>Receptionist</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rows.map((row) => (
                  <Table.Tr key={row.id}>
                    <Table.Td>{row.receivedDate}</Table.Td>
                    <Table.Td>
                      <Anchor component="button" type="button" onClick={() => setSelectedId(row.id)}>
                        {row.reference}
                      </Anchor>
                    </Table.Td>
                    <Table.Td>{row.subject}</Table.Td>
                    <Table.Td>
                      <Badge color={row.direction === "Incoming" ? "blue" : "teal"} variant="light">
                        {row.direction}
                      </Badge>
                    </Table.Td>
                    <Table.Td>{row.branch}</Table.Td>
                    <Table.Td>{row.department}</Table.Td>
                    <Table.Td>{row.receptionist}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Card>

        <CorrespondenceDetailsDrawer
          opened={Boolean(selectedCorrespondence)}
          onClose={() => setSelectedId(null)}
          reference={selectedCorrespondence?.reference ?? ""}
          subject={selectedCorrespondence?.subject ?? ""}
          direction={selectedCorrespondence?.direction}
          status={selectedCorrespondence?.status}
          fields={[
            { label: "Date", value: selectedCorrespondence?.receivedDate ?? "" },
            { label: "Due Date", value: selectedCorrespondence?.dueDate ?? "" },
            { label: "Branch", value: selectedCorrespondence?.branch ?? "" },
            { label: "Department", value: selectedCorrespondence?.department ?? "" },
            { label: "Receptionist", value: selectedCorrespondence?.receptionist ?? "" },
            { label: "Recipient", value: selectedCorrespondence?.recipient ?? "" },
            { label: "Action Owner", value: selectedCorrespondence?.actionOwner ?? "" }
          ]}
        />
      </Stack>
    </Container>
  );
}
