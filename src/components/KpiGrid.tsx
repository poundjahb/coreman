import { Box, Paper, SegmentedControl, SimpleGrid, Stack, Text } from "@mantine/core";
import { useState } from "react";

type KpiWindow = "today" | "week" | "month";

interface KpiItem {
  label: string;
  value: string;
  trend: string;
}

const kpiData: Record<KpiWindow, KpiItem[]> = {
  today: [
    { label: "Open Actions", value: "29", trend: "+2 today" },
    { label: "Due In 5 Days", value: "6", trend: "1 critical" },
    { label: "Escalated Cases", value: "1", trend: "stable" },
    { label: "Completed Today", value: "15", trend: "On target" }
  ],
  week: [
    { label: "Open Actions", value: "42", trend: "+6% this week" },
    { label: "Due In 5 Days", value: "8", trend: "2 high priority" },
    { label: "Escalated Cases", value: "3", trend: "-1 vs yesterday" },
    { label: "Completed Today", value: "15", trend: "On target" }
  ],
  month: [
    { label: "Open Actions", value: "188", trend: "-4% this month" },
    { label: "Due In 5 Days", value: "23", trend: "5 high priority" },
    { label: "Escalated Cases", value: "12", trend: "Within threshold" },
    { label: "Completed This Month", value: "322", trend: "Monthly cumulative" }
  ]
};

export function KpiGrid(): JSX.Element {
  const [window, setWindow] = useState<KpiWindow>("week");
  const kpis = kpiData[window];

  return (
    <Stack gap="sm">
      <Box style={{ display: "flex", justifyContent: "flex-end" }}>
        <SegmentedControl
          value={window}
          onChange={(val) => setWindow(val as KpiWindow)}
          data={[
            { label: "Today", value: "today" },
            { label: "This Week", value: "week" },
            { label: "This Month", value: "month" }
          ]}
          radius="xl"
        />
      </Box>

      <SimpleGrid cols={{ base: 1, xs: 2, sm: 4 }} spacing="sm">
        {kpis.map((kpi) => (
          <Paper key={kpi.label} withBorder radius="md" p="md" shadow="sm">
            <Text
              size="xs"
              fw={700}
              tt="uppercase"
              style={{ letterSpacing: "0.04em", color: "var(--ink-700)" }}
            >
              {kpi.label}
            </Text>
            <Text
              fz={32}
              fw={700}
              mt={8}
              style={{ color: "var(--primary-700)" }}
            >
              {kpi.value}
            </Text>
            <Text size="sm" mt={4} c="dimmed">
              {kpi.trend}
            </Text>
          </Paper>
        ))}
      </SimpleGrid>
    </Stack>
  );
}
