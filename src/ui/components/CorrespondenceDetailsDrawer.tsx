import { useEffect, useState } from "react";
import { Anchor, Badge, Button, Divider, Drawer, Group, Modal, SimpleGrid, Stack, Text } from "@mantine/core";
import { Download, Eye } from "lucide-react";
import { PDFViewerInDrawer } from "./PDFViewerInDrawer";

export interface CorrespondenceDetailField {
  label: string;
  value: string;
}

export interface CorrespondenceAttachmentLink {
  name: string;
  url: string;
  previewUrl?: string;
  sizeLabel?: string;
}

interface CorrespondenceDetailsDrawerProps {
  opened: boolean;
  onClose: () => void;
  reference: string;
  subject: string;
  direction?: string;
  status?: string;
  fields: CorrespondenceDetailField[];
  attachments?: CorrespondenceAttachmentLink[];
}

function getDirectionColor(direction: string): string {
  return direction.toUpperCase().includes("INCOMING") ? "blue" : "teal";
}

export function CorrespondenceDetailsDrawer(props: CorrespondenceDetailsDrawerProps): JSX.Element {
  const { opened, onClose, reference, subject, direction, status, fields, attachments } = props;
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
        <Stack gap="md">
          <div>
            <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Reference</Text>
            <Text fw={600}>{reference}</Text>
          </div>

          <div>
            <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Subject</Text>
            <Text>{subject}</Text>
          </div>

          {(direction || status) && (
            <Group gap="xs">
              {direction && (
                <Badge variant="light" color={getDirectionColor(direction)}>
                  {direction}
                </Badge>
              )}
              {status && <Badge variant="light">{status}</Badge>}
            </Group>
          )}

          <Divider />

          <SimpleGrid cols={2} spacing="md" verticalSpacing="sm">
            {fields.map((field) => (
              <div key={field.label}>
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>{field.label}</Text>
                <Text size="sm">{field.value || "-"}</Text>
              </div>
            ))}
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
                  <Group gap={4} wrap="nowrap">
                    {attachment.previewUrl && (
                      <Button
                        variant="subtle"
                        size="xs"
                        leftSection={<Eye size={14} />}
                        onClick={() => setPreviewAttachment(attachment)}
                      >
                        Open
                      </Button>
                    )}
                    <Anchor href={attachment.url} download={attachment.name} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "var(--mantine-font-size-xs)" }}>
                      <Download size={14} />
                      Download
                    </Anchor>
                  </Group>
                </Group>
              ))
            ) : (
              <Text size="sm" c="dimmed">No attachments</Text>
            )}
          </Stack>
        </Stack>
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