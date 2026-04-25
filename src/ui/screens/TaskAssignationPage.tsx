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
import { runtimePlatformTarget } from "../../platform/runtimeHostAdapter";
import { getRuntimeWorkflowMode } from "../../config/systemConfig";

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

function getFrontendBaseUrl(): string {
  const fromEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_APP_BASE_URL;
  if (typeof fromEnv === "string" && fromEnv.length > 0) {
    return fromEnv.replace(/\/$/, "");
  }

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return "http://localhost:5173";
}

function buildCorrespondenceRecordLink(correspondenceId: string): string {
  return `${getFrontendBaseUrl()}/search?correspondenceId=${encodeURIComponent(correspondenceId)}`;
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

      // Call the assignment created callback to refresh recipient list
      if (onAssignmentCreated) {
        await onAssignmentCreated();
      }

        // SERVER mode route already appends audit; handle other adapters here.
        if (runtimePlatformTarget !== "SERVER") {
          // Update correspondence status to ASSIGNED and dueDate to the latest deadline across all tasks.
          try {
            const allAssignments = await runtimeHostAdapter.taskAssignments.findByCorrespondence(selectedCorrespondenceId);
            const latestDeadline = allAssignments.reduce<Date | null>((max, a) => {
              if (!a.deadline) return max;
              const d = a.deadline instanceof Date ? a.deadline : new Date(a.deadline);
              return max === null || d > max ? d : max;
            }, null) ?? new Date(`${deadline}T00:00:00.000Z`);
            await runtimeHostAdapter.correspondences.update(selectedCorrespondenceId, {
              status: "ASSIGNED",
              dueDate: latestDeadline
            });
          } catch {
            // Non-fatal — status update failure does not roll back the assignment.
          }

          try {
            await runtimeHostAdapter.correspondenceAuditLog.append({
              correspondenceId: selectedCorrespondenceId,
              eventType: "CORRESPONDENCE_STATUS_CHANGED",
              status: "SUCCESS",
              payloadJson: JSON.stringify({
                actionName: "CORRESPONDENCE_STATUS_CHANGED",
                actionSource: "USER",
                newStatus: "ASSIGNED",
                trigger: "ASSIGNMENT_CREATED"
              }),
              createdById: effectiveCurrentUser.id
            });
          } catch {
            // Non-fatal.
          }

          try {
            await runtimeHostAdapter.correspondenceAuditLog.append({
              correspondenceId: selectedCorrespondenceId,
              eventType: "CORRESPONDENCE_ASSIGNED",
              status: "SUCCESS",
              payloadJson: JSON.stringify({
                actionName: "CORRESPONDENCE_ASSIGNED",
                actionSource: "USER",
                actionDefinitionId,
                assigneeUserId
              }),
              createdById: effectiveCurrentUser.id
            });
          } catch {
            // Non-fatal — assignment already saved.
          }

          const workflowMode = getRuntimeWorkflowMode();
          const taskType = actionDefinitions.find((item) => item.id === actionDefinitionId)?.label ?? actionDefinitionId;
          const deadlineLabel = deadline;
          const selectedCorrespondence = correspondences.find((item) => item.id === selectedCorrespondenceId);
          const reference = selectedCorrespondence?.reference ?? selectedCorrespondenceId;
          const recordLink = buildCorrespondenceRecordLink(selectedCorrespondenceId);
          const subject = `Task assigned: ${taskType} (${reference})`;
          const body = [
            "A new task has been assigned to you.",
            `Task type: ${taskType}`,
            `Deadline: ${deadlineLabel}`,
            `Correspondence: ${reference}`,
            `Open record: ${recordLink}`
          ].join("\n");
          const assignee = users.find((user) => user.id === assigneeUserId);
          const recipientEmail = assignee?.email?.trim();

          if (!recipientEmail) {
            try {
              await runtimeHostAdapter.correspondenceAuditLog.append({
                correspondenceId: selectedCorrespondenceId,
                eventType: "NOTIFICATION_SKIPPED",
                status: "SKIPPED",
                payloadJson: JSON.stringify({
                  mode: workflowMode,
                  actionName: "ASSIGNMENT_WORKFLOW",
                  taskType,
                  deadline: deadlineLabel,
                  assigneeUserId,
                  recordLink,
                  reason: "RECIPIENT_EMAIL_MISSING",
                  actionSource: "USER"
                }),
                createdById: effectiveCurrentUser.id
              });
            } catch {
              // Keep assignment success even if audit append fails.
            }
          } else {
            try {
              await runtimeHostAdapter.notifications.send({
                recipientId: assigneeUserId,
                subject,
                body,
                correspondenceId: selectedCorrespondenceId
              });

              await runtimeHostAdapter.correspondenceAuditLog.append({
                correspondenceId: selectedCorrespondenceId,
                eventType: "NOTIFICATION_SENT",
                status: "SUCCESS",
                payloadJson: JSON.stringify({
                  mode: workflowMode,
                  actionName: "ASSIGNMENT_WORKFLOW",
                  taskType,
                  deadline: deadlineLabel,
                  assigneeUserId,
                  recipientEmail,
                  subject,
                  recordLink,
                  actionSource: "USER"
                }),
                createdById: effectiveCurrentUser.id
              });
            } catch (workflowError) {
              try {
                await runtimeHostAdapter.correspondenceAuditLog.append({
                  correspondenceId: selectedCorrespondenceId,
                  eventType: "NOTIFICATION_FAILED",
                  status: "FAILED",
                  payloadJson: JSON.stringify({
                    mode: workflowMode,
                    actionName: "ASSIGNMENT_WORKFLOW",
                    taskType,
                    deadline: deadlineLabel,
                    assigneeUserId,
                    recipientEmail,
                    subject,
                    recordLink,
                    actionSource: "USER"
                  }),
                  errorMessage: workflowError instanceof Error ? workflowError.message : "Assignment notification failed",
                  createdById: effectiveCurrentUser.id
                });

                await runtimeHostAdapter.correspondenceAuditLog.append({
                  correspondenceId: selectedCorrespondenceId,
                  eventType: "WORKFLOW_FAILURE",
                  status: "FAILED",
                  payloadJson: JSON.stringify({
                    mode: workflowMode,
                    actionName: "ASSIGNMENT_WORKFLOW",
                    assigneeUserId,
                    taskType,
                    deadline: deadlineLabel,
                    actionSource: "USER"
                  }),
                  errorMessage: workflowError instanceof Error ? workflowError.message : "Assignment workflow execution failed",
                  createdById: effectiveCurrentUser.id
                });
              } catch {
                // Preserve assignment success if workflow audits fail.
              }
            }
          }
        }

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
          <Text c="dimmed" size="sm">Select an action type, assignee, optional CC users, and a deadline.</Text>
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
              <Text size="sm" c="dimmed">Correspondence ID: {correspondenceId}</Text>
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
