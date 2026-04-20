import {
  Alert,
  Badge,
  Box,
  Button,
  Divider,
  Group,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
  Title
} from "@mantine/core";
import { useState } from "react";
import { systemConfig } from "../config/systemConfig";
import { demoReferenceConfigs, demoUsers } from "../modules/admin/seedData";
import { registerCorrespondence } from "../modules/intake/registerCorrespondence";
import type { IntakeResult } from "../modules/intake/registerCorrespondence";

interface BranchOption {
  value: string;
  label: string;
  code: string;
}

interface DepartmentOption {
  value: string;
  label: string;
  code: string;
}

const BRANCHES: BranchOption[] = [{ value: "b-001", label: "HQ Branch", code: "HQ" }];
const DEPARTMENTS: DepartmentOption[] = [
  { value: "d-001", label: "Operations (OPS)", code: "OPS" }
];

export function ReceptionistScreen(): JSX.Element {
  const receptionist = demoUsers[0];

  const [subject, setSubject] = useState("");
  const [branchId, setBranchId] = useState<string | null>("b-001");
  const [departmentId, setDepartmentId] = useState<string | null>("d-001");
  const [result, setResult] = useState<IntakeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setResult(null);

    if (!subject.trim()) {
      setError("Subject is required.");
      return;
    }

    if (!branchId) {
      setError("Branch is required.");
      return;
    }

    const selectedBranch = BRANCHES.find((b) => b.value === branchId);
    const selectedDept = DEPARTMENTS.find((d) => d.value === departmentId);

    try {
      const registration = registerCorrespondence(
        receptionist,
        {
          branchId,
          branchCode: selectedBranch?.code ?? branchId,
          departmentId: departmentId ?? undefined,
          departmentCode: selectedDept?.code ?? undefined,
          subject: subject.trim()
        },
        demoReferenceConfigs,
        systemConfig.orgCode
      );
      setResult(registration);
      setSubject("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    }
  }

  return (
    <Stack gap="md">
      <Box
        style={{
          background: "linear-gradient(135deg, #10345b 0%, #0f548f 60%, #2570bd 100%)",
          borderRadius: 18,
          padding: "1.5rem",
          boxShadow: "0 20px 45px rgba(15,34,55,0.24)"
        }}
      >
        <Stack gap="xs">
          <Text
            size="xs"
            fw={700}
            style={{
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "rgba(244,248,255,0.85)"
            }}
          >
            Correspondence Intake
          </Text>
          <Title
            order={1}
            style={{
              color: "#f4f8ff",
              fontSize: "clamp(1.4rem, 2.8vw, 2rem)",
              lineHeight: 1.2
            }}
          >
            Receptionist Workspace
          </Title>
          <Group gap="sm" mt={4}>
            <Text style={{ color: "rgba(244,248,255,0.9)" }}>
              Logged in as <strong>{receptionist.fullName}</strong>
            </Text>
            <Badge color="teal" variant="filled" size="sm">
              {receptionist.roles[0]}
            </Badge>
          </Group>
        </Stack>
      </Box>

      <Paper withBorder radius="md" p="xl" shadow="sm" maw={640}>
        <Title order={2} fz="lg" mb="md">
          Register New Correspondence
        </Title>

        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            <TextInput
              label="Subject"
              placeholder="Enter correspondence subject"
              value={subject}
              onChange={(e) => setSubject(e.currentTarget.value)}
              required
              radius="md"
            />

            <Select
              label="Branch"
              placeholder="Select branch"
              data={BRANCHES.map(({ value, label }) => ({ value, label }))}
              value={branchId}
              onChange={setBranchId}
              required
              radius="md"
            />

            <Select
              label="Department"
              placeholder="Select department (optional)"
              data={DEPARTMENTS.map(({ value, label }) => ({ value, label }))}
              value={departmentId}
              onChange={setDepartmentId}
              clearable
              radius="md"
            />

            {error && (
              <Alert color="red" radius="md" title="Validation Error">
                {error}
              </Alert>
            )}

            <Button type="submit" radius="md" size="md">
              Register Correspondence
            </Button>
          </Stack>
        </form>
      </Paper>

      {result && (
        <>
          <Divider label="Registration Confirmed" labelPosition="center" />
          <Paper withBorder radius="md" p="lg" shadow="sm" maw={640}>
            <Title order={3} fz="md" mb="md" c="green.7">
              ✓ Correspondence Registered
            </Title>
            <Stack gap="xs">
              {[
                { label: "Reference Number", value: result.referenceNumber },
                { label: "Subject", value: result.subject },
                { label: "Recorded By", value: result.createdBy }
              ].map(({ label, value }) => (
                <Box
                  key={label}
                  p="xs"
                  style={{
                    borderRadius: 10,
                    border: "1px solid var(--line)",
                    background: "var(--surface)"
                  }}
                >
                  <Text
                    size="xs"
                    fw={700}
                    tt="uppercase"
                    style={{ letterSpacing: "0.06em", color: "var(--ink-500)" }}
                  >
                    {label}
                  </Text>
                  <Text fw={600} mt={4}>
                    {value}
                  </Text>
                </Box>
              ))}
            </Stack>
          </Paper>
        </>
      )}
    </Stack>
  );
}
