import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  FileInput,
  Group,
  Loader,
  Select,
  Stack,
  Text,
  TextInput,
  Textarea,
  Title
} from "@mantine/core";
import type { AppUser } from "../../domain/governance";
import type { CorrespondenceActionDefinition, CorrespondenceTaskAssignment } from "../../domain/correspondenceAction";
import { hasRole } from "../../application/services/accessControl";
import { runtimeHostAdapter } from "../../platform/runtimeHostAdapter";

interface TakeActionPageProps {
  correspondenceId?: string;
  currentUser?: AppUser;
  onActionUpdated?: () => void | Promise<void>;
}

const VALID_STATUSES = ["ASSIGNED", "IN_PROGRESS", "COMPLETED", "CANCELED"];

export function TakeActionPage(props: TakeActionPageProps = {}): JSX.Element {
  const { correspondenceId, currentUser, onActionUpdated } = props;
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<CorrespondenceTaskAssignment[]>([]);
  const [actionDefinitions, setActionDefinitions] = useState<CorrespondenceActionDefinition[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [deadline, setDeadline] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [executionComment, setExecutionComment] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load assignments for this correspondence
  useEffect(() => {
    let active = true;

    async function loadAssignments(): Promise<void> {
      try {
        setLoading(true);
        setError(null);

        if (!correspondenceId) {
          if (active) {
            setError("No correspondence ID provided");
          }
          return;
        }

        const loaded = await runtimeHostAdapter.taskAssignments.findByCorrespondence(correspondenceId);
        const loadedActionDefinitions = await runtimeHostAdapter.actionDefinitions.findAll();

        if (!active) {
          return;
        }

        // Filter to assignments assigned to current user or show all for ADMIN
        let filtered = loaded;
        if (currentUser && !hasRole(currentUser, "ADMIN") && !hasRole(currentUser, "RECIPIENT")) {
          filtered = loaded.filter((a) => a.assigneeUserId === currentUser.id);
        }

        setAssignments(filtered);
  setActionDefinitions(loadedActionDefinitions);

        // Auto-select first assignment if available
        if (filtered.length > 0) {
          const firstAssignment = filtered[0];
          setSelectedAssignmentId(firstAssignment.id);
          setStatus(firstAssignment.status);
          setDeadline(firstAssignment.deadline instanceof Date ? firstAssignment.deadline.toISOString().slice(0, 10) : new Date(firstAssignment.deadline).toISOString().slice(0, 10));
          setDescription(firstAssignment.description ?? "");
          setExecutionComment(firstAssignment.executionComment ?? "");
        } else {
          setError("No task assignments found for this correspondence");
        }
      } catch (loadError) {
        if (!active) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "Failed to load assignments");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadAssignments();

    return () => {
      active = false;
    };
  }, [correspondenceId, currentUser]);

  const selectedAssignment = useMemo(
    () => assignments.find((assignment) => assignment.id === selectedAssignmentId) ?? null,
    [assignments, selectedAssignmentId]
  );
  const selectedActionDefinition = useMemo(
    () => actionDefinitions.find((definition) => definition.id === selectedAssignment?.actionDefinitionId) ?? null,
    [actionDefinitions, selectedAssignment]
  );
  const actionTypeDescription = selectedActionDefinition?.description || "";

  // Handle assignment selection change
  function handleAssignmentChange(assignmentId: string | null): void {
    if (!assignmentId) {
      return;
    }

    const selected = assignments.find((a) => a.id === assignmentId);
    if (selected) {
      setSelectedAssignmentId(assignmentId);
      setStatus(selected.status);
      setDeadline(selected.deadline instanceof Date ? selected.deadline.toISOString().slice(0, 10) : new Date(selected.deadline).toISOString().slice(0, 10));
      setDescription(selected.description ?? "");
      setExecutionComment(selected.executionComment ?? "");
    }
  }

  async function handleUpdate(): Promise<void> {
    try {
      setError(null);
      setMessage(null);
      setSaving(true);

      if (!selectedAssignmentId) {
        setError("No assignment selected");
        return;
      }

      if (!status || !VALID_STATUSES.includes(status)) {
        setError("Invalid status selected");
        return;
      }

      if (!deadline) {
        setError("Deadline is required");
        return;
      }

      const now = new Date();
      const actorId = currentUser?.id ?? "SYSTEM";
      const isCompleted = status === "COMPLETED";

      // Call update API
      await runtimeHostAdapter.taskAssignments.update(selectedAssignmentId, {
        status: status as "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELED",
        deadline: new Date(deadline),
        executionComment: executionComment.trim().length > 0 ? executionComment.trim() : undefined,
        closedAt: isCompleted ? now : undefined,
        closedBy: isCompleted ? actorId : undefined,
        updatedBy: actorId
      });

      setMessage("Action updated successfully");

      // Callback to refresh parent list if provided
      if (onActionUpdated) {
        await onActionUpdated();
      }
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Failed to update action");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Stack gap="lg">
      <div>
        <Title order={2}>Take Action</Title>
        <Text c="dimmed" size="sm">Update deadline, status, comments, and attach supporting files.</Text>
      </div>

      {loading && (
        <Card withBorder radius="md" p="md">
          <Group justify="center">
            <Loader size="sm" />
            <Text size="sm">Loading task assignments...</Text>
          </Group>
        </Card>
      )}

      {!loading && error && (
        <Alert color="red" title="Error">
          {error}
        </Alert>
      )}

      {!loading && assignments.length > 0 && (
        <Card withBorder radius="md" p="md">
          <Stack gap="md">
            {assignments.length > 1 && (
              <Select
                label="Select task to update"
                value={selectedAssignmentId}
                onChange={handleAssignmentChange}
                data={assignments.map((a) => ({
                  value: a.id,
                  label: `Task: ${a.description || a.id} (${a.status})`
                }))}
                searchable
              />
            )}

            <Select
              label="Task status"
              value={status}
              onChange={setStatus}
              data={[
                { value: "ASSIGNED", label: "Assigned" },
                { value: "IN_PROGRESS", label: "In Progress" },
                { value: "COMPLETED", label: "Completed" },
                { value: "CANCELED", label: "Canceled" }
              ]}
              required
            />

            <TextInput
              label="Deadline"
              type="date"
              value={deadline}
              onChange={(event) => setDeadline(event.currentTarget.value)}
              required
            />

            <Textarea
              label="Action type description"
              minRows={4}
              value={actionTypeDescription}
              placeholder="No action guidance defined for this task type."
              readOnly
            />

            <Textarea
              label="Action comment (description)"
              minRows={3}
              value={description}
              placeholder="No action comment defined for this assignment."
              readOnly
            />

            <Textarea
              label="Execution comment"
              minRows={4}
              placeholder="Describe what was done, blockers, and next step"
              value={executionComment}
              onChange={(event) => setExecutionComment(event.currentTarget.value)}
            />

            <FileInput
              label="Upload file (optional)"
              placeholder="Attach evidence or response file"
              value={file}
              onChange={setFile}
              clearable
            />

            <Group justify="flex-end">
              <Button
                onClick={() => void handleUpdate()}
                loading={saving}
                disabled={!status || !deadline || saving}
              >
                Save Update
              </Button>
            </Group>
          </Stack>
        </Card>
      )}

      {message && (
        <Alert color="green" title="Update saved">
          {message}
        </Alert>
      )}
    </Stack>
  );
}
