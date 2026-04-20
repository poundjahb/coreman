import { useMemo, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Card,
  Container,
  Grid,
  Group,
  List,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title
} from "@mantine/core";
import { systemConfig } from "../config/systemConfig";
import { validateAuthMode } from "../auth/modeGuard";
import { demoReferenceConfigs, demoUsers } from "../modules/admin/seedData";
import { registerCorrespondence } from "../modules/intake/registerCorrespondence";
import { KpiCard } from "../components/KpiCard";
import { KpiWindowSelector } from "../components/KpiWindowSelector";
import { DataRow } from "../components/DataRow";
import type { KpiWindow } from "../components/KpiWindowSelector";

export function DashboardScreen(): JSX.Element {
  const [kpiWindow, setKpiWindow] = useState<KpiWindow>("week");

  const appModeCheck = validateAuthMode(systemConfig.authMode, "APP");
  const intakePreview = registerCorrespondence(
    demoUsers[0],
    {
      branchId: "b-001",
      branchCode: "HQ",
      departmentId: "d-001",
      departmentCode: "OPS",
      subject: "Incoming regulatory letter"
    },
    demoReferenceConfigs,
    systemConfig.orgCode
  );

  const kpis = useMemo(() => {
    const valuesByWindow = {
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
        { label: "Completed Today", value: "322", trend: "Monthly cumulative" }
      ]
    };
    return valuesByWindow[kpiWindow];
  }, [kpiWindow]);

  return (
    <Container size="xl" py="lg">
      <Stack gap="lg">
        {/* Hero */}
        <Card
          radius="lg"
          p="xl"
          style={{
            background: "linear-gradient(135deg, #10345b 0%, #0f548f 60%, #2570bd 100%)",
            color: "#f4f8ff"
          }}
        >
          <Grid align="center">
            <Grid.Col span={{ base: 12, md: 8 }}>
              <Stack gap="xs">
                <Text size="xs" tt="uppercase" fw={700} style={{ letterSpacing: "0.08em", color: "rgba(244,248,255,0.85)" }}>
                  Correspondence Operations
                </Text>
                <Title order={1} style={{ color: "#f4f8ff", fontSize: "clamp(1.4rem, 2.8vw, 2.1rem)" }}>
                  Enterprise Correspondence Control Center
                </Title>
                <Text style={{ color: "rgba(244,248,255,0.9)", maxWidth: "62ch" }}>
                  Monitor workflows, enforce governance, and keep branch communications moving with
                  clear accountability.
                </Text>
              </Stack>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Box
                p="md"
                style={{
                  background: "rgba(255,255,255,0.14)",
                  border: "1px solid rgba(255,255,255,0.28)",
                  borderRadius: 14,
                  backdropFilter: "blur(4px)"
                }}
              >
                <Text size="xs" tt="uppercase" fw={700} mb="xs" style={{ color: "rgba(244,248,255,0.86)", letterSpacing: "0.06em" }}>
                  System Posture
                </Text>
                <Stack gap={4}>
                  <Text size="sm" style={{ color: "#f4f8ff" }}>
                    Authentication: <strong>{systemConfig.authMode}</strong>
                  </Text>
                  <Text size="sm" style={{ color: "#f4f8ff" }}>
                    Mode Guard:{" "}
                    <Badge color={appModeCheck.success ? "green" : "red"} size="xs">
                      {appModeCheck.success ? "VALID" : "INVALID"}
                    </Badge>
                  </Text>
                </Stack>
              </Box>
            </Grid.Col>
          </Grid>
        </Card>

        {/* KPI Window Selector */}
        <Group justify="flex-end">
          <KpiWindowSelector value={kpiWindow} onChange={setKpiWindow} />
        </Group>

        {/* KPI Grid */}
        <SimpleGrid cols={{ base: 1, xs: 2, sm: 4 }} aria-label="Key metrics">
          {kpis.map((kpi) => (
            <KpiCard key={kpi.label} label={kpi.label} value={kpi.value} trend={kpi.trend} />
          ))}
        </SimpleGrid>

        {/* Panel Grid */}
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          {/* Phase 1 Delivery — spans full row */}
          <Card withBorder radius="md" p="lg" style={{ gridColumn: "1 / -1" }}>
            <Title order={3} mb="xs">Phase 1 Delivery Baseline</Title>
            <Text c="dimmed" mb="xs">
              Governance and foundational controls are in place, with secure role enforcement and
              mode exclusivity guards.
            </Text>
            <List spacing="xs" size="sm" c="dimmed">
              <List.Item>Explicit user governance and role checks</List.Item>
              <List.Item>APP vs ENTRA authentication mode guardrails</List.Item>
              <List.Item>Configurable reference generation by scope precedence</List.Item>
            </List>
          </Card>

          {/* Intake Preview */}
          <Card withBorder radius="md" p="lg">
            <Title order={3} mb="sm">Intake Preview</Title>
            <Stack gap="xs">
              <DataRow label="Subject" value={intakePreview.subject} />
              <DataRow label="Reference" value={intakePreview.referenceNumber} />
              <DataRow label="Recorded By" value={intakePreview.createdBy} />
            </Stack>
          </Card>

          {/* Operational Highlights */}
          <Card withBorder radius="md" p="lg">
            <Title order={3} mb="xs">Operational Highlights</Title>
            <List spacing="xs" size="sm" c="dimmed">
              <List.Item>Branch and department-specific reference patterns available</List.Item>
              <List.Item>Readiness for app-triggered notification flows</List.Item>
              <List.Item>Deadline monitor integration planned in next phase</List.Item>
            </List>
          </Card>

          {/* Next Milestone */}
          <Card
            withBorder
            radius="md"
            p="lg"
            style={{
              background: "linear-gradient(140deg, #fff4df, #ffffff 70%)",
              borderColor: "#e6c791"
            }}
          >
            <Title order={3} mb="xs">Next Milestone</Title>
            <Text c="dimmed" mb="md">Phase 2: Dataverse persistence and app-to-flow contracts.</Text>
            <Button variant="filled" color="blue" radius="md" size="sm">
              Open Implementation Board
            </Button>
          </Card>
        </SimpleGrid>

        {/* Execution Roadmap */}
        <Card withBorder radius="md" p="lg">
          <Title order={3} mb="md">Execution Roadmap</Title>
          <SimpleGrid cols={{ base: 1, sm: 3 }}>
            {[
              {
                phase: "Current",
                description: "Phase 1 complete and validated foundations in code.",
                color: "green"
              },
              {
                phase: "Next",
                description: "Phase 2 implementation with data persistence and flow triggers.",
                color: "blue"
              },
              {
                phase: "After",
                description: "SLA automation and role-restricted operational dashboards.",
                color: "violet"
              }
            ].map(({ phase, description, color }) => (
              <Paper key={phase} withBorder radius="md" p="sm">
                <Group gap="xs" mb={6}>
                  <ThemeIcon color={color} size="xs" radius="xl" />
                  <Text size="xs" tt="uppercase" fw={700} c={color} style={{ letterSpacing: "0.06em" }}>
                    {phase}
                  </Text>
                </Group>
                <Text size="sm" c="dimmed">{description}</Text>
              </Paper>
            ))}
          </SimpleGrid>
        </Card>
      </Stack>
    </Container>
  );
}
