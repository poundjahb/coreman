import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Center,
  Group,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title
} from "@mantine/core";
import type { AppUser } from "../../domain/governance";

const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
const apiBaseUrl = (env?.VITE_API_BASE_URL ?? "http://localhost:3001").replace(/\/$/, "");

interface LoginPageProps {
  onLogin: (user: AppUser) => void;
}

export function LoginPage({ onLogin }: LoginPageProps): JSX.Element {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (!userId.trim() || !password) {
      setError("User ID and password are required.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId: userId.trim(), password })
      });

      if (!response.ok) {
        const payload = await response.json() as { error?: string };
        setError(payload.error ?? "Login failed.");
        return;
      }

      const user = await response.json() as AppUser;
      onLogin(user);
    } catch {
      setError("Unable to reach the server. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Center style={{ minHeight: "100vh", background: "var(--mantine-color-gray-0)" }}>
      <Box w={380}>
        <Stack gap="xl">
          <Box ta="center">
            <Title order={2}>Correspondence Management</Title>
            <Text c="dimmed" size="sm" mt={4}>Sign in to your workspace</Text>
          </Box>

          <Paper withBorder shadow="sm" p="xl" radius="md">
            <form onSubmit={(e) => void handleSubmit(e)}>
              <Stack gap="md">
                {error && (
                  <Alert color="red" title="Sign-in failed">
                    {error}
                  </Alert>
                )}

                <TextInput
                  label="User ID"
                  placeholder="admin@coreman.com"
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.currentTarget.value)}
                  autoComplete="username"
                  required
                />

                <PasswordInput
                  label="Password"
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.currentTarget.value)}
                  autoComplete="current-password"
                  required
                />

                <Group justify="flex-end" mt="xs">
                  <Button type="submit" loading={loading} fullWidth>
                    Sign in
                  </Button>
                </Group>
              </Stack>
            </form>
          </Paper>

          <Text ta="center" c="dimmed" size="xs">
            Default admin is <strong>admin@coreman.com</strong> with password <strong>coreman</strong> unless changed by your administrator.
          </Text>
        </Stack>
      </Box>
    </Center>
  );
}
