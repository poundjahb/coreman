import { Badge, Box, Button, Grid, List, Paper, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { useEffect, useMemo, useState } from "react";
import { validateAuthMode } from "../auth/modeGuard";
import { systemConfig } from "../config/systemConfig";
import { demoReferenceConfigs, demoUsers } from "../modules/admin/seedData";
import { registerCorrespondence } from "../modules/intake/registerCorrespondence";
import { HeroHeader } from "../components/HeroHeader";
import { KpiGrid } from "../components/KpiGrid";

export function DashboardScreen(): JSX.Element {
  const [refreshedAt, setRefreshedAt] = useState<Date>(new Date());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRefreshedAt(new Date());
    }, 30000);
    return () => window.clearInterval(timer);
  }, []);

  const appModeCheck = validateAuthMode(systemConfig.authMode, "APP");

  const intakePreview = useMemo(
    () =>
      registerCorrespondence(
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
      ),
    []
  );

  return (
    <Stack gap="md">
      <HeroHeader
        authMode={systemConfig.authMode}
        modeGuardValid={appModeCheck.success}
        refreshedAt={refreshedAt}
      />

      <KpiGrid />

      <Grid>
        <Grid.Col span={12}>
          <Paper withBorder radius="md" p="md" shadow="sm">
            <Title order={2} mb="sm" fz="lg">
              Phase 1 Delivery Baseline
            </Title>
            <Text c="dimmed" mb="sm">
              Governance and foundational controls are in place, with secure role enforcement and
              mode exclusivity guards.
            </Text>
            <List size="sm" spacing={4}>
              <List.Item>Explicit user governance and role checks</List.Item>
              <List.Item>APP vs ENTRA authentication mode guardrails</List.Item>
              <List.Item>Configurable reference generation by scope precedence</List.Item>
            </List>
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 4 }}>
          <Paper withBorder radius="md" p="md" shadow="sm" h="100%">
            <Title order={2} mb="sm" fz="lg">
              Intake Preview
            </Title>
            <Stack gap="xs">
              {[
                { label: "Subject", value: intakePreview.subject },
                { label: "Reference", value: intakePreview.referenceNumber },
                { label: "Recorded By", value: intakePreview.createdBy }
              ].map(({ label, value }) => (
                <Box
                  key={label}
                  p="xs"
                  style={{
                    borderRadius: 10,
                    border: "1px solid var(--line)",
                    background: "var(--surface)"
                  }}
                >
                  <Text
                    size="xs"
                    fw={700}
                    tt="uppercase"
                    style={{ letterSpacing: "0.06em", color: "var(--ink-500)" }}
                  >
                    {label}
                  </Text>
                  <Text fw={600} mt={4}>
                    {value}
                  </Text>
                </Box>
              ))}
            </Stack>
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 4 }}>
          <Paper withBorder radius="md" p="md" shadow="sm" h="100%">
            <Title order={2} mb="sm" fz="lg">
              Operational Highlights
            </Title>
            <List size="sm" spacing={4} c="dimmed">
              <List.Item>Branch and department-specific reference patterns available</List.Item>
              <List.Item>Readiness for app-triggered notification flows</List.Item>
              <List.Item>Deadline monitor integration planned in next phase</List.Item>
            </List>
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 4 }}>
          <Paper
            withBorder
            radius="md"
            p="md"
            shadow="sm"
            h="100%"
            style={{
              background: "linear-gradient(140deg, var(--accent-100), #ffffff 70%)",
              borderColor: "#e6c791"
            }}
          >
            <Title order={2} mb="sm" fz="lg">
              Next Milestone
            </Title>
            <Text c="dimmed" mb="md">
              Phase 2: Dataverse persistence and app-to-flow contracts.
            </Text>
            <Button variant="filled" size="sm" radius="md">
              Open Implementation Board
            </Button>
          </Paper>
        </Grid.Col>
      </Grid>

      <Paper withBorder radius="md" p="md" shadow="sm">
        <Title order={2} mb="md" fz="lg">
          Execution Roadmap
        </Title>
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
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
              color: "grape"
            }
          ].map(({ phase, description, color }) => (
            <Box
              key={phase}
              p="sm"
              style={{
                borderRadius: 12,
                border: "1px solid var(--line)",
                background: "#ffffff"
              }}
            >
              <Badge color={color} variant="light" size="sm" mb={6}>
                {phase}
              </Badge>
              <Text size="sm" c="dimmed">
                {description}
              </Text>
            </Box>
          ))}
        </SimpleGrid>
      </Paper>
    </Stack>
  );
}
