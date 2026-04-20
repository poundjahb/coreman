import { Box, Text } from "@mantine/core";

interface DataRowProps {
  label: string;
  value: string;
}

export function DataRow({ label, value }: DataRowProps): JSX.Element {
  return (
    <Box p="sm" style={{ border: "1px solid var(--mantine-color-gray-3)", borderRadius: 10, background: "var(--mantine-color-gray-0)" }}>
      <Text size="xs" tt="uppercase" fw={700} c="dimmed" style={{ letterSpacing: "0.06em" }}>
        {label}
      </Text>
      <Text fw={600} mt={4} ff="monospace">
        {value}
      </Text>
    </Box>
  );
}
