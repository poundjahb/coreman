import { Badge, Box, Group, Stack, Text, Title } from "@mantine/core";

interface HeroHeaderProps {
  authMode: string;
  modeGuardValid: boolean;
  refreshedAt: Date;
}

export function HeroHeader({ authMode, modeGuardValid, refreshedAt }: HeroHeaderProps): JSX.Element {
  return (
    <Box
      style={{
        background: "linear-gradient(135deg, #10345b 0%, #0f548f 60%, #2570bd 100%)",
        borderRadius: 18,
        padding: "1.5rem",
        boxShadow: "0 20px 45px rgba(15,34,55,0.24)",
        display: "grid",
        gridTemplateColumns: "1.8fr 1fr",
        gap: "1rem"
      }}
    >
      <Stack gap="xs">
        <Text
          size="xs"
          fw={700}
          style={{
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "rgba(244,248,255,0.85)"
          }}
        >
          Correspondence Operations
        </Text>
        <Title
          order={1}
          style={{
            color: "#f4f8ff",
            fontSize: "clamp(1.4rem, 2.8vw, 2.1rem)",
            lineHeight: 1.2
          }}
        >
          Enterprise Correspondence Control Center
        </Title>
        <Text style={{ color: "rgba(244,248,255,0.9)", maxWidth: "62ch" }}>
          Monitor workflows, enforce governance, and keep branch communications moving with clear
          accountability.
        </Text>
      </Stack>

      <Box
        style={{
          alignSelf: "center",
          background: "rgba(255,255,255,0.14)",
          border: "1px solid rgba(255,255,255,0.28)",
          borderRadius: 14,
          padding: "0.9rem 1rem",
          backdropFilter: "blur(4px)"
        }}
      >
        <Text
          size="xs"
          fw={700}
          style={{
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "rgba(244,248,255,0.86)",
            marginBottom: "0.5rem"
          }}
        >
          System Posture
        </Text>
        <Stack gap={6}>
          <Text size="sm" c="#f4f8ff">
            Authentication: <strong>{authMode}</strong>
          </Text>
          <Group gap="xs">
            <Text size="sm" c="#f4f8ff">
              Mode Guard:
            </Text>
            <Badge color={modeGuardValid ? "green" : "red"} size="sm" variant="filled">
              {modeGuardValid ? "VALID" : "INVALID"}
            </Badge>
          </Group>
          <Text size="sm" c="#f4f8ff">
            Refreshed: <strong>{refreshedAt.toLocaleTimeString()}</strong>
          </Text>
        </Stack>
      </Box>
    </Box>
  );
}
