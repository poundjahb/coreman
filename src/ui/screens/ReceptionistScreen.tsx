import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  Container,
  Divider,
  Group,
  Loader,
  Select,
  Stack,
  Tabs,
  Text,
  TextInput,
  Title
} from "@mantine/core";
import { Dropzone } from "@mantine/dropzone";
import { notifications } from "@mantine/notifications";
import { UploadCloud, FileText, X } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import type { CorrespondenceDirection } from "../../domain/correspondence";
import type { AppUser, Department } from "../../domain/governance";
import { registerCorrespondenceInHost } from "../../application/modules/intake/registerCorrespondence";
import { systemConfig } from "../../config/systemConfig";
import { runtimeHostAdapter } from "../../platform/runtimeHostAdapter";

const directionOptions: Array<{ value: CorrespondenceDirection; label: string }> = [
  { value: "INCOMING", label: "Incoming" },
  { value: "OUTGOING", label: "Outgoing" }
];

function getDirectionFromQuery(rawValue: string | null): CorrespondenceDirection {
  return rawValue === "OUTGOING" ? "OUTGOING" : "INCOMING";
}

function resetFormState() {
  return {
    subject: "",
    senderReference: "",
    fromTo: "",
    organisation: "",
    correspondenceDate: "",
    recipientTab: "staff" as "staff" | "department",
    recipientUserId: null as string | null,
    recipientDepartmentId: null as string | null,
    attachedFiles: [] as File[]
  };
}

export function ReceptionistScreen(props: { currentUser: AppUser }): JSX.Element {
  const { currentUser } = props;
  const [searchParams] = useSearchParams();

  const [subject, setSubject] = useState("");
  const [senderReference, setSenderReference] = useState("");
  const [fromTo, setFromTo] = useState("");
  const [organisation, setOrganisation] = useState("");
  const [correspondenceDate, setCorrespondenceDate] = useState("");
  const [direction, setDirection] = useState<CorrespondenceDirection>(() =>
    getDirectionFromQuery(searchParams.get("direction"))
  );
  const [error, setError] = useState<string | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [recipientTab, setRecipientTab] = useState<"staff" | "department">("staff");
  const [recipientUserId, setRecipientUserId] = useState<string | null>(null);
  const [recipientDepartmentId, setRecipientDepartmentId] = useState<string | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);

  useEffect(() => {
    let active = true;

    async function loadFormData(): Promise<void> {
      try {
        setLoading(true);
        const [loadedDepartments, loadedUsers] = await Promise.all([
          runtimeHostAdapter.departments.findAll(),
          runtimeHostAdapter.users.findAll()
        ]);

        if (!active) return;

        setDepartments(loadedDepartments);
        setUsers(loadedUsers.filter((u) => u.isActive && u.id !== currentUser.id));
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Unable to load registration data.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadFormData();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    setDirection(getDirectionFromQuery(searchParams.get("direction")));
  }, [searchParams]);

  function handleReset(): void {
    const s = resetFormState();
    setSubject(s.subject);
    setSenderReference(s.senderReference);
    setFromTo(s.fromTo);
    setOrganisation(s.organisation);
    setCorrespondenceDate(s.correspondenceDate);
    setRecipientTab(s.recipientTab);
    setRecipientUserId(s.recipientUserId);
    setRecipientDepartmentId(s.recipientDepartmentId);
    setAttachedFiles(s.attachedFiles);
    setError(null);
  }

  async function handleRegister(): Promise<void> {
    setError(null);

    if (!subject.trim()) {
      setError("Please enter a subject for the correspondence.");
      return;
    }

    if (!fromTo.trim()) {
      setError(direction === "INCOMING" ? "Please enter the sender name." : "Please enter the recipient name.");
      return;
    }

    const effectiveDepartmentId =
      recipientTab === "department" && recipientDepartmentId
        ? recipientDepartmentId
        : currentUser.departmentId;

    try {
      setSubmitting(true);
      const intake = await registerCorrespondenceInHost(
        runtimeHostAdapter,
        currentUser,
        {
          branchId: currentUser.branchId,
          departmentId: effectiveDepartmentId,
          subject: subject.trim(),
          direction,
          senderReference: senderReference.trim() || undefined,
          fromTo: fromTo.trim(),
          organisation: organisation.trim() || undefined,
          correspondenceDate: correspondenceDate
            ? new Date(`${correspondenceDate}T00:00:00.000Z`)
            : undefined,
          recipientId: recipientTab === "staff" ? (recipientUserId ?? undefined) : undefined,
          attachmentFile: attachedFiles[0]
        },
        systemConfig.orgCode
      );

      notifications.show({
        title: "Correspondence registered",
        message: `${intake.referenceNumber} — ${intake.subject}`,
        color: "green",
        autoClose: 6000
      });

      handleReset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Container size="md" py="lg">
      <Stack gap="lg">
        <Box>
          <Group gap="sm" align="center" mb={4}>
            <Title order={2}>
              Register {direction === "INCOMING" ? "Incoming" : "Outgoing"} Correspondence
            </Title>
            
          </Group>
          
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
              label="Type"
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
              label="Sender Reference (optional)"
              placeholder="e.g. BCC10/230426"
              value={senderReference}
              onChange={(e) => setSenderReference(e.currentTarget.value)}
              description="If empty, the system generates a fallback reference automatically."
            />

            <TextInput
              label={direction === "INCOMING" ? "From (Sender)" : "To (Recipient)"}
              placeholder={direction === "INCOMING" ? "e.g. John Doe" : "e.g. Jane Smith"}
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
                type="date"
                value={correspondenceDate}
                onChange={(e) => setCorrespondenceDate(e.currentTarget.value)}
              />
            </Group>

            {/* ── Recipient ── */}
            <Box>
              <Text size="sm" fw={500} mb={6}>
                Recipient
              </Text>
              <Tabs
                value={recipientTab}
                onChange={(v) => setRecipientTab((v as "staff" | "department") ?? "staff")}
              >
                <Tabs.List>
                  <Tabs.Tab value="staff">Send directly to a staff</Tabs.Tab>
                  <Tabs.Tab value="department">Send to a department</Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="staff" pt="sm">
                  <Select
                    placeholder="Search and select a staff member…"
                    data={users.map((u) => ({
                      value: u.id,
                      label: `${u.fullName} — ${u.employeeCode}`
                    }))}
                    value={recipientUserId}
                    onChange={setRecipientUserId}
                    searchable
                    clearable
                    disabled={loading || submitting}
                    nothingFoundMessage="No matching staff found"
                  />
                </Tabs.Panel>

                <Tabs.Panel value="department" pt="sm">
                  <Select
                    placeholder="Select a department…"
                    data={departments
                      .filter((d) => d.isActive)
                      .map((d) => ({ value: d.id, label: `${d.code} — ${d.name}` }))}
                    value={recipientDepartmentId}
                    onChange={setRecipientDepartmentId}
                    disabled={loading || submitting}
                  />
                </Tabs.Panel>
              </Tabs>
            </Box>

            {/* ── Attachments ── */}
            <Box>
              <Text size="sm" fw={500} mb={6}>
                Attachments
              </Text>
              <Dropzone
                onDrop={(files) => setAttachedFiles((prev) => [...prev, ...files])}
                accept={["application/pdf", "image/png", "image/jpeg", "image/tiff"]}
                disabled={submitting}
                radius="md"
              >
                <Group justify="center" gap="xl" mih={80} style={{ pointerEvents: "none" }}>
                  <Dropzone.Accept>
                    <UploadCloud size={32} color="var(--mantine-color-blue-6)" />
                  </Dropzone.Accept>
                  <Dropzone.Reject>
                    <X size={32} color="var(--mantine-color-red-6)" />
                  </Dropzone.Reject>
                  <Dropzone.Idle>
                    <UploadCloud size={32} color="var(--mantine-color-dimmed)" />
                  </Dropzone.Idle>
                  <Box>
                    <Text size="sm" fw={500}>
                      Drop files here or click to browse
                    </Text>
                    <Text size="xs" c="dimmed">
                      PDF, PNG, JPEG, TIFF
                    </Text>
                  </Box>
                </Group>
              </Dropzone>

              {attachedFiles.length > 0 && (
                <Stack gap={4} mt="xs">
                  {attachedFiles.map((file, idx) => (
                    <Group key={idx} gap="xs" justify="space-between">
                      <Group gap={6}>
                        <FileText size={14} />
                        <Text size="sm">{file.name}</Text>
                        <Text size="xs" c="dimmed">
                          ({(file.size / 1024).toFixed(1)} KB)
                        </Text>
                      </Group>
                      <Button
                        variant="subtle"
                        color="red"
                        size="compact-xs"
                        onClick={() =>
                          setAttachedFiles((prev) => prev.filter((_, i) => i !== idx))
                        }
                      >
                        Remove
                      </Button>
                    </Group>
                  ))}
                </Stack>
              )}
            </Box>

            <Group justify="flex-end" mt="xs">
              <Button variant="default" onClick={handleReset} disabled={submitting}>
                Clear
              </Button>
              <Button
                onClick={() => void handleRegister()}
                color="blue"
                loading={submitting}
                disabled={loading}
              >
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
      </Stack>
    </Container>
  );
}
