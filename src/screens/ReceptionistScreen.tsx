import { useState } from "react";
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Container,
  Divider,
  Group,
  Select,
  Stack,
  Text,
  TextInput,
  Title
} from "@mantine/core";
import { demoReferenceConfigs, demoUsers } from "../modules/admin/seedData";
import { registerCorrespondence } from "../modules/intake/registerCorrespondence";
import type { IntakeResult } from "../modules/intake/registerCorrespondence";
import { systemConfig } from "../config/systemConfig";
import { DataRow } from "../components/DataRow";

const BRANCHES = [
  { value: "b-001", label: "HQ — Head Office" },
  { value: "b-002", label: "BRN-02 — North Branch" }
];

const DEPARTMENTS = [
  { value: "d-001", label: "OPS — Operations" },
  { value: "d-002", label: "FIN — Finance" }
];

const BRANCH_META: Record<string, { code: string }> = {
  "b-001": { code: "HQ" },
  "b-002": { code: "BRN-02" }
};

const DEPT_META: Record<string, { code: string }> = {
  "d-001": { code: "OPS" },
  "d-002": { code: "FIN" }
};

export function ReceptionistScreen(): JSX.Element {
  const receptionist = demoUsers.find((u) => u.roles.includes("RECEPTIONIST")) ?? demoUsers[0];

  const [subject, setSubject] = useState("");
  const [branchId, setBranchId] = useState<string | null>("b-001");
  const [departmentId, setDepartmentId] = useState<string | null>("d-001");
  const [result, setResult] = useState<IntakeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleRegister(): void {
    setError(null);
    setResult(null);

    if (!subject.trim()) {
      setError("Please enter a subject for the correspondence.");
      return;
    }

    if (!branchId || !departmentId) {
      setError("Please select both a branch and a department.");
      return;
    }

    try {
      const intake = registerCorrespondence(
        receptionist,
        {
          branchId,
          branchCode: BRANCH_META[branchId]?.code ?? branchId,
          departmentId,
          departmentCode: DEPT_META[departmentId]?.code ?? departmentId,
          subject: subject.trim()
        },
        demoReferenceConfigs,
        systemConfig.orgCode
      );
      setResult(intake);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    }
  }

  function handleReset(): void {
    setSubject("");
    setBranchId("b-001");
    setDepartmentId("d-001");
    setResult(null);
    setError(null);
  }

  return (
    <Container size="md" py="lg">
      <Stack gap="lg">
        {/* Page header */}
        <Box>
          <Group gap="sm" align="center" mb={4}>
            <Title order={2}>Register Correspondence</Title>
            <Badge color="blue" variant="light" size="lg">
              Receptionist
            </Badge>
          </Group>
          <Text c="dimmed" size="sm">
            Logged in as <strong>{receptionist.fullName}</strong> ({receptionist.employeeCode})
          </Text>
        </Box>

        <Divider />

        {/* Intake Form */}
        <Card withBorder radius="md" p="xl">
          <Stack gap="md">
            <Title order={4} c="blue.8">
              Correspondence Details
            </Title>

            <TextInput
              label="Subject"
              placeholder="e.g. Incoming regulatory letter from CBN"
              value={subject}
              onChange={(e) => setSubject(e.currentTarget.value)}
              required
            />

            <Group grow>
              <Select
                label="Branch"
                data={BRANCHES}
                value={branchId}
                onChange={setBranchId}
                required
              />
              <Select
                label="Department"
                data={DEPARTMENTS}
                value={departmentId}
                onChange={setDepartmentId}
                required
              />
            </Group>

            <Group justify="flex-end" mt="xs">
              <Button variant="default" onClick={handleReset}>
                Clear
              </Button>
              <Button onClick={handleRegister} color="blue">
                Register Correspondence
              </Button>
            </Group>
          </Stack>
        </Card>

        {/* Error feedback */}
        {error && (
          <Alert color="red" title="Validation Error" radius="md">
            {error}
          </Alert>
        )}

        {/* Success result */}
        {result && (
          <Card withBorder radius="md" p="xl" bd="1px solid green.4">
            <Stack gap="xs">
              <Group gap="xs" mb={4}>
                <Title order={4} c="green.8">
                  Correspondence Registered
                </Title>
                <Badge color="green" size="sm">
                  Success
                </Badge>
              </Group>

              <DataRow label="Reference Number" value={result.referenceNumber} />
              <DataRow label="Subject" value={result.subject} />
              <DataRow label="Recorded By" value={result.createdBy} />

              <Group justify="flex-end" mt="xs">
                <Button variant="light" color="blue" onClick={handleReset}>
                  Register Another
                </Button>
              </Group>
            </Stack>
          </Card>
        )}
      </Stack>
    </Container>
  );
}
