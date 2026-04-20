import { useState } from "react";
import {
  Alert,
  Button,
  Card,
  Container,
  FileInput,
  Group,
  Select,
  Stack,
  Text,
  TextInput,
  Textarea,
  Title
} from "@mantine/core";

export function TakeActionPage(): JSX.Element {
  const [status, setStatus] = useState<string | null>("In Progress");
  const [deadline, setDeadline] = useState("2026-04-24");
  const [comment, setComment] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function handleUpdate(): void {
    setMessage(
      `Action updated with status ${status ?? "Unknown"}, deadline ${deadline}, comment length ${comment.length}, file ${file?.name ?? "none"}.`
    );
  }

  return (
    <Container size="md" py="lg">
      <Stack gap="lg">
        <div>
          <Title order={2}>Take Action</Title>
          <Text c="dimmed" size="sm">Update deadline, status, comments, and attach supporting files.</Text>
        </div>

        <Card withBorder radius="md" p="md">
          <Stack gap="md">
            <Select
              label="Task status"
              value={status}
              onChange={setStatus}
              data={[
                { value: "Assigned", label: "Assigned" },
                { value: "In Progress", label: "In Progress" },
                { value: "Blocked", label: "Blocked" },
                { value: "Completed", label: "Completed" }
              ]}
            />
            <TextInput
              label="Deadline"
              type="date"
              value={deadline}
              onChange={(event) => setDeadline(event.currentTarget.value)}
            />
            <Textarea
              label="Action comment"
              minRows={4}
              placeholder="Describe what was done, blockers, and next step"
              value={comment}
              onChange={(event) => setComment(event.currentTarget.value)}
            />
            <FileInput
              label="Upload file"
              placeholder="Attach evidence or response file"
              value={file}
              onChange={setFile}
              clearable
            />
            <Group justify="flex-end">
              <Button onClick={handleUpdate}>Save Update</Button>
            </Group>
          </Stack>
        </Card>

        {message && (
          <Alert color="green" title="Update saved">
            {message}
          </Alert>
        )}
      </Stack>
    </Container>
  );
}
