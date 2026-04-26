import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Container,
  Group,
  Loader,
  MultiSelect,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title
} from "@mantine/core";
import type { AppUser } from "../../domain/governance";
import type { Correspondence } from "../../domain/correspondence";
import type { CorrespondenceActionDefinition } from "../../domain/correspondenceAction";
import { runtimeHostAdapter } from "../../platform/runtimeHostAdapter";

interface TaskAssignationPageProps {
  correspondenceId?: string;
  currentUser?: AppUser;
  onAssignmentCreated?: () => void | Promise<void>;
}

function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `asg-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function formatDefaultDeadline(daysFromToday: number): string {
  const safeDays = Number.isFinite(daysFromToday) ? Math.max(0, Math.trunc(daysFromToday)) : 0;
  const dueDate = new Date();
  dueDate.setUTCHours(0, 0, 0, 0);
  dueDate.setUTCDate(dueDate.getUTCDate() + safeDays);
  return dueDate.toISOString().slice(0, 10);
}

export function TaskAssignationPage(props: TaskAssignationPageProps): JSX.Element {
  const { correspondenceId, currentUser, onAssignmentCreated } = props;
  const [selectedCorrespondenceId, setSelectedCorrespondenceId] = useState<string | null>(correspondenceId ?? null);
  const [actionDefinitionId, setActionDefinitionId] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [assigneeUserId, setAssigneeUserId] = useState<string | null>(null);
  const [deadline, setDeadline] = useState("");
  const [ccUsers, setCcUsers] = useState<string[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [actionDefinitions, setActionDefinitions] = useState<CorrespondenceActionDefinition[]>([]);
  const [correspondences, setCorrespondences] = useState<Correspondence[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadDependencies(): Promise<void> {
      try {
        setLoading(true);
        setError(null);
        const [loadedDefinitions, loadedUsers, loadedCorrespondences] = await Promise.all([
          runtimeHostAdapter.actionDefinitions.findActive(),
          runtimeHostAdapter.users.findAll(),
          runtimeHostAdapter.correspondences.findAll()
        ]);

        if (!active) {
          return;
        }

        setActionDefinitions(loadedDefinitions);
        setUsers(loadedUsers.filter((user) => user.isActive));
        setCorrespondences(loadedCorrespondences);
      } catch (loadError) {
        if (!active) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "Failed to load assignation dependencies.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadDependencies();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (correspondenceId) {
      setSelectedCorrespondenceId(correspondenceId);
    }
  }, [correspondenceId]);

  const fallbackCurrentUser = useMemo(
    () => users.find((user) => user.canLogin) ?? users[0],
    [users]
  );
  const effectiveCurrentUser = currentUser ?? fallbackCurrentUser;
  const selectedCorrespondence = useMemo(
    () => correspondences.find((item) => item.id === selectedCorrespondenceId) ?? null,
    [correspondences, selectedCorrespondenceId]
  );
  const selectedActionDefinition = useMemo(
    () => actionDefinitions.find((definition) => definition.id === actionDefinitionId) ?? null,
    [actionDefinitionId, actionDefinitions]
  );

  useEffect(() => {
    if (!selectedActionDefinition) {
      return;
    }

    const defaultDeadlineDays =
      selectedActionDefinition.defaultDeadlineDays ?? selectedActionDefinition.defaultSlaDays;

    if (defaultDeadlineDays === undefined) {
      return;
    }

    setDeadline(formatDefaultDeadline(defaultDeadlineDays));
  }, [selectedActionDefinition]);

  async function submitAssignation(): Promise<void> {
    if (!selectedCorrespondenceId) {
      setMessage("Select a correspondence before submitting.");
      return;
    }

    if (!actionDefinitionId || !assigneeUserId || !deadline) {
      setMessage("Action type, assignee, and deadline are required.");
      return;
    }

    if (!effectiveCurrentUser) {
      setMessage("No active current user available for assignment audit fields.");
      return;
    }

    try {
      setSaving(true);
      setMessage(null);
      setError(null);

      const now = new Date();
      await runtimeHostAdapter.taskAssignments.save({
        id: createId(),
        correspondenceId: selectedCorrespondenceId,
        actionDefinitionId,
        description: description.trim() || undefined,
        assigneeUserId,
        ccUserIds: ccUsers,
        deadline: new Date(`${deadline}T00:00:00.000Z`),
        status: "ASSIGNED",
        createdAt: now,
        updatedAt: now,
        createdBy: effectiveCurrentUser.id,
        updatedBy: effectiveCurrentUser.id
      });

      setMessage("Assignment created successfully.");
      setActionDefinitionId(null);
      setDescription("");
      setAssigneeUserId(null);
      setCcUsers([]);
      setDeadline("");

      await onAssignmentCreated?.();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to create assignment.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Container size="lg" py="lg">
      <Stack gap="lg">
        <div>
          <Title order={2}>Task Assignation</Title>
          <Text c="dimmed" size="sm">
            Select an action type, assignee, optional CC users, and a deadline. Deadline defaults from the action
            definition when configured.
          </Text>
        </div>

        {loading && (
          <Group justify="center" py="sm">
            <Loader size="sm" />
          </Group>
        )}

        {error && (
          <Alert color="red" title="Assignation Error">
            {error}
          </Alert>
        )}

        <Card withBorder radius="md" p="md">
          <Stack gap="md">
            {!correspondenceId && (
              <Select
                label="Correspondence"
                data={correspondences.map((item) => ({ value: item.id, label: `${item.reference} - ${item.subject}` }))}
                value={selectedCorrespondenceId}
                onChange={setSelectedCorrespondenceId}
                placeholder="Select correspondence"
                searchable
              />
            )}

            {correspondenceId && (
              <Text size="sm" c="dimmed">
                Correspondence: {selectedCorrespondence?.subject ?? "Loading correspondence..."}
              </Text>
            )}

            <Group grow>
              <Select
                label="Action type"
                data={actionDefinitions.map((definition) => ({ value: definition.id, label: definition.label }))}
                value={actionDefinitionId}
                onChange={setActionDefinitionId}
                placeholder="Select action definition"
                searchable
              />
              <Select
                label="Assign to user"
                data={users.map((user) => ({ value: user.id, label: user.fullName }))}
                value={assigneeUserId}
                onChange={setAssigneeUserId}
                placeholder="Select one assignee"
                searchable
              />
            </Group>

            <Textarea
              label="Description (optional)"
              placeholder="Add context or execution notes for this assigned action"
              value={description}
              onChange={(event) => setDescription(event.currentTarget.value)}
              minRows={2}
            />

            <Group grow>
              <MultiSelect
                label="CC notification users"
                data={users.map((user) => ({ value: user.id, label: user.fullName }))}
                value={ccUsers}
                onChange={setCcUsers}
                placeholder="Optional"
                searchable
              />
              <TextInput
                label="Deadline"
                type="date"
                value={deadline}
                onChange={(event) => setDeadline(event.currentTarget.value)}
              />
            </Group>

            <Group justify="flex-end">
              <Button color="dark" onClick={() => void submitAssignation()} loading={saving}>
                Submit Assignation
              </Button>
            </Group>
          </Stack>
        </Card>

        {message && (
          <Alert color="blue" title="Assignation status">
            {message}
          </Alert>
        )}
      </Stack>
    </Container>
  );
}
