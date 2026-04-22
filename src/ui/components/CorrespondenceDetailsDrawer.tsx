import { Badge, Divider, Drawer, Group, SimpleGrid, Stack, Text } from "@mantine/core";

export interface CorrespondenceDetailField {
  label: string;
  value: string;
}

interface CorrespondenceDetailsDrawerProps {
  opened: boolean;
  onClose: () => void;
  reference: string;
  subject: string;
  direction?: string;
  status?: string;
  fields: CorrespondenceDetailField[];
}

function getDirectionColor(direction: string): string {
  return direction.toUpperCase().includes("INCOMING") ? "blue" : "teal";
}

export function CorrespondenceDetailsDrawer(props: CorrespondenceDetailsDrawerProps): JSX.Element {
  const { opened, onClose, reference, subject, direction, status, fields } = props;

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
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
      </Stack>
    </Drawer>
  );
}