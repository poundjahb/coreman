import { Container, Stack, Tabs, Text, Title } from "@mantine/core";

// Re-export all page components for backward compatibility
export { AdminBranchesPage } from "./AdminBranchesPage";
export { AdminDepartmentsPage } from "./AdminDepartmentsPage";
export { AdminUsersPage } from "./AdminUsersPage";
export { AdminActionsCatalogPage } from "./AdminActionsCatalogPage";
export { AdminSmtpSettingsPage } from "./AdminSmtpSettingsPage"; // Legacy export
export { AdminEmailSettingsPage } from "./AdminEmailSettingsPage";
export { AdminFlowAgentsPage } from "./AdminFlowAgentsPage";
export { AdminDateManagementPage } from "./AdminDateManagementPage";
export { AdminAuditLogsPage } from "./AdminAuditLogsPage";
export { AdminHealthPage } from "./AdminHealthPage";
export { AdminPerformancePage } from "./AdminPerformancePage";

// Import page components for tab wrappers
import { AdminBranchesPage } from "./AdminBranchesPage";
import { AdminDepartmentsPage } from "./AdminDepartmentsPage";
import { AdminActionsCatalogPage } from "./AdminActionsCatalogPage";
import { AdminEmailSettingsPage } from "./AdminEmailSettingsPage";
import { AdminDateManagementPage } from "./AdminDateManagementPage";

/**
 * Tab wrapper for Reference Data (Branches + Departments)
 */
export function AdminReferenceDataPage(): JSX.Element {
  return (
    <Container size="xl" py="lg">
      <Stack gap="lg">
        <div>
          <Title order={2}>Admin - Reference Data</Title>
          <Text c="dimmed" size="sm">Manage branch and department reference data from a single entry point.</Text>
        </div>

        <Tabs defaultValue="branches" variant="outline">
          <Tabs.List>
            <Tabs.Tab value="branches">Branches</Tabs.Tab>
            <Tabs.Tab value="departments">Departments</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="branches" pt="md">
            <AdminBranchesPage embedded />
          </Tabs.Panel>

          <Tabs.Panel value="departments" pt="md">
            <AdminDepartmentsPage embedded />
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
}

/**
 * Tab wrapper for System Control (Email Settings + Actions)
 */
export function AdminSystemControlTabPage(): JSX.Element {
  return (
    <Container size="xl" py="lg">
      <Stack gap="lg">
        <div>
          <Title order={2}>Admin - System Control</Title>
          <Text c="dimmed" size="sm">Manage email settings and action definitions from a single entry point.</Text>
        </div>

        <Tabs defaultValue="email" variant="outline">
          <Tabs.List>
            <Tabs.Tab value="email">Email Settings</Tabs.Tab>
            <Tabs.Tab value="actions">Actions</Tabs.Tab>
            <Tabs.Tab value="date-management">Date Management</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="email" pt="md">
            <AdminEmailSettingsPage embedded />
          </Tabs.Panel>

          <Tabs.Panel value="actions" pt="md">
            <AdminActionsCatalogPage embedded />
          </Tabs.Panel>

          <Tabs.Panel value="date-management" pt="md">
            <AdminDateManagementPage embedded />
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
}

