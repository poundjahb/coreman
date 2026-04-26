import { useEffect, useMemo, useState } from "react";
import { Alert, Card, Container, Group, Loader, SimpleGrid, Stack, Table, Text, Title } from "@mantine/core";
import { KpiCard } from "../components/KpiCard";
import type { Branch } from "../../domain/governance";
import type { Correspondence } from "../../domain/correspondence";
import { runtimeHostAdapter } from "../../platform/runtimeHostAdapter";

interface BranchSnapshotRow {
  id: string;
  code: string;
  processed: number;
  withinSlaRate: number;
  overdue: number;
  avgDays: number;
}

function isClosedLike(status: Correspondence["status"]): boolean {
  return status === "CLOSED" || status === "AUTO_CLOSED" || status === "CANCELLED";
}

function daysBetween(start: Date, end: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.max(0, (end.getTime() - start.getTime()) / msPerDay);
}

function isOverdue(correspondence: Correspondence, today: Date): boolean {
  if (!correspondence.dueDate || isClosedLike(correspondence.status)) {
    return false;
  }

  return correspondence.dueDate.getTime() < today.getTime();
}

function isWithinSla(correspondence: Correspondence): boolean {
  if (!isClosedLike(correspondence.status)) {
    return false;
  }

  if (!correspondence.dueDate) {
    return true;
  }

  return correspondence.updatedAt.getTime() <= correspondence.dueDate.getTime();
}

function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

function formatDays(value: number): string {
  return value.toFixed(1);
}

export function GeneralDashboardPage(): JSX.Element {
  const [correspondences, setCorrespondences] = useState<Correspondence[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadData(): Promise<void> {
      try {
        setLoading(true);
        setError(null);

        const [loadedCorrespondences, loadedBranches] = await Promise.all([
          runtimeHostAdapter.correspondences.findAll(),
          runtimeHostAdapter.branches.findAll()
        ]);

        if (!active) {
          return;
        }

        setCorrespondences(loadedCorrespondences);
        setBranches(loadedBranches);
      } catch (loadError) {
        if (!active) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "Unable to load dashboard data.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      active = false;
    };
  }, []);

  const stats = useMemo(() => {
    const today = new Date();
    const totalProcessed = correspondences.length;
    const closedCorrespondences = correspondences.filter((item) => isClosedLike(item.status));
    const withinSlaCount = correspondences.filter(isWithinSla).length;
    const withinSlaRate = totalProcessed === 0 ? 0 : (withinSlaCount / totalProcessed) * 100;
    const overdueCount = correspondences.filter((item) => isOverdue(item, today)).length;
    const avgHandlingDays = closedCorrespondences.length === 0
      ? 0
      : closedCorrespondences.reduce((sum, item) => sum + daysBetween(item.createdAt, item.updatedAt), 0)
        / closedCorrespondences.length;

    return {
      totalProcessed,
      withinSlaRate,
      avgHandlingDays,
      overdueCount
    };
  }, [correspondences]);

  const branchRows = useMemo<BranchSnapshotRow[]>(() => {
    const today = new Date();
    const branchById = new Map(branches.map((branch) => [branch.id, branch]));
    const correspondenceGroups = new Map<string, Correspondence[]>();

    for (const correspondence of correspondences) {
      const current = correspondenceGroups.get(correspondence.branchId) ?? [];
      current.push(correspondence);
      correspondenceGroups.set(correspondence.branchId, current);
    }

    const sourceBranchIds = new Set<string>([
      ...branches.map((branch) => branch.id),
      ...correspondenceGroups.keys()
    ]);

    return [...sourceBranchIds].map((branchId) => {
      const branchCorrespondences = correspondenceGroups.get(branchId) ?? [];
      const processed = branchCorrespondences.length;
      const withinSlaCount = branchCorrespondences.filter(isWithinSla).length;
      const withinSlaRate = processed === 0 ? 0 : (withinSlaCount / processed) * 100;
      const overdue = branchCorrespondences.filter((item) => isOverdue(item, today)).length;
      const closed = branchCorrespondences.filter((item) => isClosedLike(item.status));
      const avgDays = closed.length === 0
        ? 0
        : closed.reduce((sum, item) => sum + daysBetween(item.createdAt, item.updatedAt), 0) / closed.length;

      return {
        id: branchId,
        code: branchById.get(branchId)?.code ?? branchId,
        processed,
        withinSlaRate,
        overdue,
        avgDays
      };
    }).sort((left, right) => left.code.localeCompare(right.code));
  }, [branches, correspondences]);

  return (
    <Container size="xl" py="lg">
      <Stack gap="lg">
        <div>
          <Title order={2}>General Correspondence Dashboard</Title>
          <Text c="dimmed" size="sm">Executive view of organization-wide correspondence processing performance.</Text>
        </div>

        {error && (
          <Alert color="red" title="Dashboard Load Failed">
            {error}
          </Alert>
        )}

        {loading && (
          <Card withBorder radius="md" p="md">
            <Group justify="center" py="sm">
              <Loader size="sm" />
              <Text size="sm">Loading live dashboard data...</Text>
            </Group>
          </Card>
        )}

        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
          <KpiCard label="Total Processed" value={String(stats.totalProcessed)} trend="All recorded correspondences" />
          <KpiCard label="Within SLA" value={formatPercent(stats.withinSlaRate)} trend="Closed items meeting SLA" />
          <KpiCard label="Avg Handling Time" value={`${formatDays(stats.avgHandlingDays)}d`} trend="From creation to latest update" />
          <KpiCard label="Critical Overdue" value={String(stats.overdueCount)} trend="Open items past due date" />
        </SimpleGrid>

        <Card withBorder radius="md" p="md">
          <Group justify="space-between" mb="sm">
            <Title order={4}>Branch Performance Snapshot</Title>
          </Group>
          <Table.ScrollContainer minWidth={760}>
            <Table striped>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Branch</Table.Th>
                  <Table.Th>Processed</Table.Th>
                  <Table.Th>Within SLA</Table.Th>
                  <Table.Th>Overdue</Table.Th>
                  <Table.Th>Avg Days</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {branchRows.map((row) => (
                  <Table.Tr key={row.id}>
                    <Table.Td>{row.code}</Table.Td>
                    <Table.Td>{row.processed}</Table.Td>
                    <Table.Td>{formatPercent(row.withinSlaRate)}</Table.Td>
                    <Table.Td>{row.overdue}</Table.Td>
                    <Table.Td>{formatDays(row.avgDays)}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
          {!loading && branchRows.length === 0 && (
            <Text size="sm" c="dimmed" mt="sm">No branch performance data available.</Text>
          )}
        </Card>
      </Stack>
    </Container>
  );
}
