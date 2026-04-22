import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Container,
  Divider,
  Group,
  Loader,
  Select,
  Stack,
  Text,
  TextInput,
  Title
} from "@mantine/core";
import { useSearchParams } from "react-router-dom";
import type { CorrespondenceDirection } from "../../domain/correspondence";
import type { AppUser, Branch, Department } from "../../domain/governance";
import { filterDepartmentsForBranch } from "../../application/services/branchDepartmentPolicy";
import { registerCorrespondenceInHost } from "../../application/modules/intake/registerCorrespondence";
import type { IntakeResult } from "../../application/modules/intake/registerCorrespondence";
import { systemConfig } from "../../config/systemConfig";
import { runtimeHostAdapter } from "../../platform/runtimeHostAdapter";
import { DataRow } from "../components/DataRow";

const directionOptions: Array<{ value: CorrespondenceDirection; label: string }> = [
  { value: "INCOMING", label: "Incoming" },
  { value: "OUTGOING", label: "Outgoing" }
];

function getDirectionFromQuery(rawValue: string | null): CorrespondenceDirection {
  return rawValue === "OUTGOING" ? "OUTGOING" : "INCOMING";
}

function getDirectionBadgeColor(direction: CorrespondenceDirection): string {
  return direction === "INCOMING" ? "blue" : "dark";
}

export function ReceptionistScreen(props: { currentUser: AppUser }): JSX.Element {
  const { currentUser } = props;
  const [searchParams] = useSearchParams();

  const [subject, setSubject] = useState("");
  const [fromTo, setFromTo] = useState("");
  const [organisation, setOrganisation] = useState("");
  const [correspondenceDate, setCorrespondenceDate] = useState("");
  const [branchId, setBranchId] = useState<string | null>(currentUser.branchId);
  const [departmentId, setDepartmentId] = useState<string | null>(currentUser.departmentId);
  const [direction, setDirection] = useState<CorrespondenceDirection>(() =>
    getDirectionFromQuery(searchParams.get("direction"))
  );
  const [result, setResult] = useState<IntakeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadFormData(): Promise<void> {
      try {
        setLoading(true);
        const [loadedBranches, loadedDepartments] = await Promise.all([
          runtimeHostAdapter.branches.findAll(),
          runtimeHostAdapter.departments.findAll()
        ]);

        if (!active) {
          return;
        }

        setBranches(loadedBranches);
        setDepartments(loadedDepartments);
        setBranchId((current) => current ?? loadedBranches[0]?.id ?? null);
        setDepartmentId((current) => current ?? loadedDepartments[0]?.id ?? null);
      } catch (loadError) {
        if (!active) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "Unable to load registration data.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadFormData();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setDirection(getDirectionFromQuery(searchParams.get("direction")));
  }, [searchParams]);

  const branchOptions = useMemo(
    () => branches.map((item) => ({ value: item.id, label: `${item.code} - ${item.name}` })),
    [branches]
  );

  const allowedDepartments = useMemo(
    () => filterDepartmentsForBranch(branchId, departments),
    [branchId, departments]
  );

  const departmentOptions = useMemo(
    () => allowedDepartments.map((item) => ({ value: item.id, label: `${item.code} - ${item.name}` })),
    [allowedDepartments]
  );

  useEffect(() => {
    if (!departmentId) {
      setDepartmentId(allowedDepartments[0]?.id ?? null);
      return;
    }

    if (!allowedDepartments.some((item) => item.id === departmentId)) {
      setDepartmentId(allowedDepartments[0]?.id ?? null);
    }
  }, [allowedDepartments, departmentId]);

  async function handleRegister(): Promise<void> {
    setError(null);
    setResult(null);

    if (!subject.trim()) {
      setError("Please enter a subject for the correspondence.");
      return;
    }

    if (!fromTo.trim()) {
      setError(direction === "INCOMING" ? "Please enter the sender name." : "Please enter the recipient name.");
      return;
    }

    if (!branchId || !departmentId) {
      setError("Please select both a branch and a department.");
      return;
    }

    try {
      setSubmitting(true);
      const intake = await registerCorrespondenceInHost(
        runtimeHostAdapter,
        currentUser,
        {
          branchId,
          departmentId,
          subject: subject.trim(),
          direction,
          fromTo: fromTo.trim(),
          organisation: organisation.trim() || undefined,
          correspondenceDate: correspondenceDate ? new Date(`${correspondenceDate}T00:00:00.000Z`) : undefined
        },
        systemConfig.orgCode
      );
      setResult(intake);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset(): void {
  setSubject("");
  setFromTo("");
  setOrganisation("");
  setCorrespondenceDate("");
  setBranchId(currentUser.branchId);

    const defaults = filterDepartmentsForBranch(currentUser.branchId, departments);
    const defaultDepartment = defaults.some((item) => item.id === currentUser.departmentId)
      ? currentUser.departmentId
      : defaults[0]?.id ?? null;

    setDepartmentId(defaultDepartment);
    setResult(null);
    setError(null);
  }

  return (
    <Container size="md" py="lg">
      <Stack gap="lg">
        <Box>
          <Group gap="sm" align="center" mb={4}>
            <Title order={2}>Register {direction === "INCOMING" ? "Incoming" : "Outgoing"} Correspondence</Title>
            <Badge color={getDirectionBadgeColor(direction)} variant="light" size="lg">
              Receptionist
            </Badge>
          </Group>
          <Text c="dimmed" size="sm">
            Logged in as <strong>{currentUser.fullName}</strong> ({currentUser.employeeCode})
          </Text>
        </Box>

        <Divider />

        <Card withBorder radius="md" p="xl">
          {loading && (
            <Group justify="center" py="xl">
              <Loader size="sm" />
            </Group>
          )}
          <Stack gap="md">
            <Title order={4} c="blue.8">
              Correspondence Details
            </Title>

            <Select
              label="Direction"
              data={directionOptions}
              value={direction}
              onChange={(value) => setDirection((value as CorrespondenceDirection) ?? "INCOMING")}
              disabled={submitting}
            />

            <TextInput
              label="Subject"
              placeholder={
                direction === "INCOMING"
                  ? "e.g. Incoming regulatory letter from CBN"
                  : "e.g. Outgoing response memo to branch"
              }
              value={subject}
              onChange={(e) => setSubject(e.currentTarget.value)}
              required
            />

            <TextInput
              label={direction === "INCOMING" ? "From (Sender)" : "To (Recipient)"}
              placeholder={
                direction === "INCOMING" ? "e.g. John Doe" : "e.g. Jane Smith"
              }
              value={fromTo}
              onChange={(e) => setFromTo(e.currentTarget.value)}
              required
            />

            <Group grow>
              <TextInput
                label="Organisation"
                placeholder="e.g. Central Bank"
                value={organisation}
                onChange={(e) => setOrganisation(e.currentTarget.value)}
              />
              <TextInput
                label="Correspondence Date"
                placeholder="YYYY-MM-DD"
                type="date"
                value={correspondenceDate}
                onChange={(e) => setCorrespondenceDate(e.currentTarget.value)}
              />
            </Group>

            <Group grow>
              <Select
                label="Branch"
                data={branchOptions}
                value={branchId}
                onChange={setBranchId}
                required
                disabled={loading || submitting}
              />
              <Select
                label="Department"
                data={departmentOptions}
                value={departmentId}
                onChange={setDepartmentId}
                required
                disabled={loading || submitting}
              />
            </Group>

            <Group justify="flex-end" mt="xs">
              <Button variant="default" onClick={handleReset} disabled={submitting}>
                Clear
              </Button>
              <Button onClick={() => void handleRegister()} color="blue" loading={submitting} disabled={loading}>
                Register Correspondence
              </Button>
            </Group>
          </Stack>
        </Card>

        {error && (
          <Alert color="red" title="Validation Error" radius="md">
            {error}
          </Alert>
        )}

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
