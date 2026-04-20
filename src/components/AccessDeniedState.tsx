import { Alert, Button, Group, Stack, Text, Title } from "@mantine/core";
import { Link } from "react-router-dom";
import type { RoleCode } from "../domain/governance";

interface AccessDeniedStateProps {
  requiredRoles: RoleCode[];
}

export function AccessDeniedState({ requiredRoles }: AccessDeniedStateProps): JSX.Element {
  return (
    <Stack gap="md" maw={760}>
      <Title order={3}>Access Restricted</Title>
      <Alert color="orange" title="You are not allowed to view this page.">
        <Text size="sm">Required role(s): {requiredRoles.join(", ")}.</Text>
      </Alert>
      <Group>
        <Button component={Link} to="/receptionist/dashboard" variant="light">
          Go to Receptionist Dashboard
        </Button>
      </Group>
    </Stack>
  );
}
