import { Paper, Text } from "@mantine/core";

export interface KpiCardProps {
  label: string;
  value: string;
  trend: string;
}

export function KpiCard({ label, value, trend }: KpiCardProps): JSX.Element {
  return (
    <Paper withBorder radius="md" p="md" shadow="xs">
      <Text size="xs" tt="uppercase" fw={700} c="dimmed" mb={4}>
        {label}
      </Text>
      <Text size="xl" fw={700} c="blue.8" style={{ fontSize: "2rem" }}>
        {value}
      </Text>
      <Text size="sm" c="dimmed" mt={4}>
        {trend}
      </Text>
    </Paper>
  );
}
