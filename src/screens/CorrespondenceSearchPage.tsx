import { useMemo, useState } from "react";
import { Badge, Card, Container, Group, Select, Stack, Table, Text, TextInput, Title } from "@mantine/core";
import { correspondences } from "../mocks/uiData";

export function CorrespondenceSearchPage(): JSX.Element {
  const [reference, setReference] = useState("");
  const [subject, setSubject] = useState("");
  const [branch, setBranch] = useState<string | null>("all");
  const [status, setStatus] = useState<string | null>("all");

  const rows = useMemo(() => {
    return correspondences
      .filter((item) => (branch === "all" ? true : item.branch === branch))
      .filter((item) => (status === "all" ? true : item.status === status))
      .filter((item) => item.reference.toLowerCase().includes(reference.trim().toLowerCase()))
      .filter((item) => item.subject.toLowerCase().includes(subject.trim().toLowerCase()));
  }, [reference, subject, branch, status]);

  return (
    <Container size="xl" py="lg">
      <Stack gap="lg">
        <div>
          <Title order={2}>Correspondence Search</Title>
          <Text c="dimmed" size="sm">Search correspondence across the organization with multi-criteria filters.</Text>
        </div>

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
              data={[
                { value: "all", label: "All" },
                { value: "HQ", label: "HQ" },
                { value: "BRN-02", label: "BRN-02" }
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
                    <Table.Td>{row.reference}</Table.Td>
                    <Table.Td>{row.subject}</Table.Td>
                    <Table.Td>{row.branch}</Table.Td>
                    <Table.Td>{row.department}</Table.Td>
                    <Table.Td><Badge variant="light">{row.status}</Badge></Table.Td>
                    <Table.Td>{row.dueDate}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
          {rows.length === 0 && <Text c="dimmed" size="sm">No correspondence found.</Text>}
        </Card>
      </Stack>
    </Container>
  );
}
