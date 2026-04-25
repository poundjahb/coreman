import { useEffect, useState } from "react";
import { ActionIcon, Anchor, Badge, Divider, Drawer, Group, Modal, ScrollArea, SimpleGrid, Stack, Tabs, Text, Tooltip, Code } from "@mantine/core";
import { Download, Eye } from "lucide-react";
import { PDFViewerInDrawer } from "./PDFViewerInDrawer";

export interface CorrespondenceAttachmentLink {
  name: string;
  url: string;
  previewUrl?: string;
  sizeLabel?: string;
}

export interface CorrespondenceLinkedAction {
  id: string;
  label: string;
  assignee: string;
  deadline: string;
  status: string;
  description?: string;
}

export interface CorrespondenceAuditEntry {
  id: string;
  eventType: string;
  status: string;
  createdAt: string;
  createdBy: string;
  details?: string;
}

interface CorrespondenceDetailsDrawerProps {
  opened: boolean;
  onClose: () => void;
  reference: string;
  subject: string;
  status?: string;
  summary?: string;
  sender?: string;
  organisation?: string;
  correspondenceDate?: string;
  receivedDate?: string;
  dueDate?: string;
  receivedBy?: string;
  recipient?: string;
  branch?: string;
  department?: string;
  attachments?: CorrespondenceAttachmentLink[];
  actions?: CorrespondenceLinkedAction[];
  audits?: CorrespondenceAuditEntry[];
}

export function CorrespondenceDetailsDrawer(props: CorrespondenceDetailsDrawerProps): JSX.Element {
  function formatAuditEventType(eventType: string): string {
    const labels: Record<string, string> = {
      CORRESPONDENCE_CREATED: "Correspondence Created",
      CORRESPONDENCE_UPDATED: "Correspondence Updated",
      CORRESPONDENCE_ASSIGNED: "Task Assigned",
      CORRESPONDENCE_STATUS_CHANGED: "Status Changed",
      NOTIFICATION_SENT: "Notification Sent",
      NOTIFICATION_SKIPPED: "Notification Skipped",
      NOTIFICATION_FAILED: "Notification Failed",
      WORKFLOW_FAILURE: "Workflow Failure",
      AGENT_CALL: "Agent Called",
      AGENT_RESPONSE: "Agent Response",
      POWERFLOW_CALL: "Power Automate Called",
      POWERFLOW_RESPONSE: "Power Automate Response"
    };
    return labels[eventType] ?? eventType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function auditStatusColor(status: string): string {
    if (status === "FAILED") return "red";
    if (status === "SKIPPED") return "orange";
    return "green";
  }

  function formatAuditDetails(raw: string): string {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (parsed.actionName && typeof parsed.actionName === "string") {
        const { actionName, actionSource, ...rest } = parsed;
        const extra = Object.entries(rest)
          .filter(([, v]) => v !== null && v !== undefined && v !== "")
          .map(([k, v]) => `${k}: ${String(v)}`)
          .join("  |  ");
        return `${actionName} (${actionSource ?? "SYSTEM"})${extra ? "\n" + extra : ""}`;
      }
      return JSON.stringify(parsed, null, 2);
    } catch {
      return raw;
    }
  }

  const {
    opened,
    onClose,
    reference,
    subject,
    status,
    summary,
    sender,
    organisation,
    correspondenceDate,
    receivedDate,
    dueDate,
    receivedBy,
    recipient,
    branch,
    department,
    attachments,
    actions,
    audits
  } = props;
  const [previewAttachment, setPreviewAttachment] = useState<CorrespondenceAttachmentLink | null>(null);

  useEffect(() => {
    if (!opened) {
      setPreviewAttachment(null);
    }
  }, [opened]);

  function handleClose(): void {
    setPreviewAttachment(null);
    onClose();
  }

  return (
    <>
      <Drawer
        opened={opened}
        onClose={handleClose}
        position="right"
        size="md"
        title="Correspondence Details"
        overlayProps={{ opacity: 0.25, blur: 2 }}
      >
        <Tabs defaultValue="correspondence">
          <Tabs.List>
            <Tabs.Tab value="correspondence">Correspondence</Tabs.Tab>
            <Tabs.Tab value="actions">Actions</Tabs.Tab>
            <Tabs.Tab value="audit">Audit</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="correspondence" pt="md">
            <Stack gap="md">
              <SimpleGrid cols={2} spacing="md" verticalSpacing="sm">
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Reference</Text>
                  <Text fw={600}>{reference || "-"}</Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Status</Text>
                  {status ? <Badge variant="light">{status}</Badge> : <Text size="sm">-</Text>}
                </div>
              </SimpleGrid>

              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Subject</Text>
                <Text size="sm">{subject || "-"}</Text>
              </div>

              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Summary</Text>
                <Text size="sm">{summary || "-"}</Text>
              </div>

              <SimpleGrid cols={2} spacing="md" verticalSpacing="sm">
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Sender</Text>
                  <Text size="sm">{sender || "-"}</Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Organisation</Text>
                  <Text size="sm">{organisation || "-"}</Text>
                </div>
              </SimpleGrid>

              <SimpleGrid cols={3} spacing="md" verticalSpacing="sm">
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Correspondence Date</Text>
                  <Text size="sm">{correspondenceDate || "-"}</Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Receive Date</Text>
                  <Text size="sm">{receivedDate || "-"}</Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Due Date</Text>
                  <Text size="sm">{dueDate || "-"}</Text>
                </div>
              </SimpleGrid>

              <SimpleGrid cols={2} spacing="md" verticalSpacing="sm">
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Received By</Text>
                  <Text size="sm">{receivedBy || "-"}</Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Recipient</Text>
                  <Text size="sm">{recipient || "-"}</Text>
                </div>
              </SimpleGrid>

              <SimpleGrid cols={2} spacing="md" verticalSpacing="sm">
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Branch</Text>
                  <Text size="sm">{branch || "-"}</Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Department</Text>
                  <Text size="sm">{department || "-"}</Text>
                </div>
              </SimpleGrid>

              <Divider />

              <Stack gap="xs">
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Attachments</Text>
                {attachments && attachments.length > 0 ? (
                  attachments.map((attachment) => (
                    <Group key={`${attachment.name}-${attachment.url}`} gap="xs" justify="space-between" align="center">
                      <Text size="sm" style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {attachment.name}{attachment.sizeLabel ? ` (${attachment.sizeLabel})` : ""}
                      </Text>
                      <Group gap={6} wrap="nowrap">
                        {attachment.previewUrl && (
                          <Tooltip label="View">
                            <ActionIcon
                              variant="light"
                              size="sm"
                              onClick={() => setPreviewAttachment(attachment)}
                              aria-label={`View ${attachment.name}`}
                            >
                              <Eye size={14} />
                            </ActionIcon>
                          </Tooltip>
                        )}
                        <Anchor href={attachment.url} download={attachment.name} aria-label={`Download ${attachment.name}`}>
                          <Tooltip label="Download">
                            <ActionIcon variant="light" size="sm" component="span">
                              <Download size={14} />
                            </ActionIcon>
                          </Tooltip>
                        </Anchor>
                      </Group>
                    </Group>
                  ))
                ) : (
                  <Text size="sm" c="dimmed">No attachments</Text>
                )}
              </Stack>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="actions" pt="md">
            <ScrollArea.Autosize mah={520}>
              <Stack gap="sm">
                {actions && actions.length > 0 ? (
                  actions.map((action) => (
                    <Stack key={action.id} gap={4} p="sm" style={{ border: "1px solid var(--mantine-color-gray-3)", borderRadius: 8 }}>
                      <Group justify="space-between" align="start">
                        <Text fw={600} size="sm">{action.label}</Text>
                        <Badge variant="light">{action.status}</Badge>
                      </Group>
                      <Text size="xs" c="dimmed">Assignee: {action.assignee}</Text>
                      <Text size="xs" c="dimmed">Deadline: {action.deadline || "-"}</Text>
                      {action.description && <Text size="sm">{action.description}</Text>}
                    </Stack>
                  ))
                ) : (
                  <Text size="sm" c="dimmed">No linked actions.</Text>
                )}
              </Stack>
            </ScrollArea.Autosize>
          </Tabs.Panel>

          <Tabs.Panel value="audit" pt="md">
            <ScrollArea.Autosize mah={520}>
              <Stack gap="sm">
                {audits && audits.length > 0 ? (
                  audits.map((audit) => (
                    <Stack key={audit.id} gap={4} p="sm" style={{ border: "1px solid var(--mantine-color-gray-3)", borderRadius: 8 }}>
                      <Group justify="space-between" align="start">
                          <Text fw={600} size="sm">{formatAuditEventType(audit.eventType)}</Text>
                          <Badge variant="light" color={auditStatusColor(audit.status)}>{audit.status}</Badge>
                      </Group>
                      <Text size="xs" c="dimmed">At: {audit.createdAt}</Text>
                      <Text size="xs" c="dimmed">By: {audit.createdBy}</Text>
                        {audit.details && <Code block style={{ fontSize: 11, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{formatAuditDetails(audit.details)}</Code>}
                    </Stack>
                  ))
                ) : (
                  <Text size="sm" c="dimmed">No audit entries.</Text>
                )}
              </Stack>
            </ScrollArea.Autosize>
          </Tabs.Panel>
        </Tabs>
      </Drawer>

      <Modal
        opened={Boolean(previewAttachment?.previewUrl)}
        onClose={() => setPreviewAttachment(null)}
        title={previewAttachment?.name ?? "PDF Preview"}
        size="90%"
        centered
        overlayProps={{ opacity: 0.3, blur: 3 }}
      >
        {previewAttachment?.previewUrl && (
          <div style={{ height: "80vh" }}>
            <PDFViewerInDrawer
              previewUrl={previewAttachment.previewUrl}
              downloadUrl={previewAttachment.url}
              fileName={previewAttachment.name}
            />
          </div>
        )}
      </Modal>
    </>
  );
}