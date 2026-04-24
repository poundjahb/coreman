import { Fragment, useEffect, useMemo, useState } from "react";
import {
  Alert,
  AppShell,
  Avatar,
  Box,
  Burger,
  Divider,
  Group,
  Menu,
  Select,
  Stack,
  Text,
  Title,
  UnstyledButton
} from "@mantine/core";
import {
  Activity,
  ChartColumnBig,
  ClipboardCheck,
  FileSearch,
  History,
  LayoutDashboard,
  ChevronRight,
  Search,
  Settings,
  UserCog,
  Users,
  Building2
} from "lucide-react";
import { Navigate, NavLink as RouterNavLink, Route, Routes, useLocation } from "react-router-dom";
import type { AppUser, RoleCode } from "./domain/governance";
import { hasRole } from "./application/services/accessControl";
import { runtimeHostAdapter } from "./platform/runtimeHostAdapter";
import { AccessDeniedState } from "./ui/components/AccessDeniedState";
import { ReceptionistDashboardPage } from "./ui/screens/ReceptionistDashboardPage";
import { ReceptionistHistoryPage } from "./ui/screens/ReceptionistHistoryPage";
import { ReceptionistScreen } from "./ui/screens/ReceptionistScreen";
import { WorkDashboardPage } from "./ui/screens/WorkDashboardPage";
import { TaskAssignationPage } from "./ui/screens/TaskAssignationPage";
import { TakeActionPage } from "./ui/screens/TakeActionPage";
import { GeneralDashboardPage } from "./ui/screens/GeneralDashboardPage";
import { CorrespondenceSearchPage } from "./ui/screens/CorrespondenceSearchPage";
import {
  AdminActionsCatalogPage,
  AdminAuditLogsPage,
  AdminBranchesPage,
  AdminDepartmentsPage,
  AdminFlowAgentsPage,
  AdminHealthPage,
  AdminPerformancePage,
  AdminReferenceDataPage,
  AdminSystemControlTabPage,
  AdminUsersPage
} from "./ui/screens/admin/AdminPages";

const bootstrapBranch = {
  id: "branch-bootstrap-main",
  code: "MAIN",
  name: "Main Branch",
  isActive: true
};

const bootstrapDepartment = {
  id: "department-bootstrap-admin",
  code: "ADMIN",
  name: "Administration",
  isActive: true
};

const fallbackAdminUser: AppUser = {
  id: "user-bootstrap-admin",
  employeeCode: "BOOT-001",
  fullName: "Bootstrap Administrator",
  email: "bootstrap.admin@local",
  branchId: bootstrapBranch.id,
  departmentId: bootstrapDepartment.id,
  isActive: true,
  canLogin: true,
  canOwnActions: true,
  roles: ["ADMIN", "RECEPTIONIST", "RECIPIENT", "ACTION_OWNER", "COPIED_VIEWER", "DASHBOARD_VIEWER"]
};

interface RoleMenuItem {
  label: string;
  to: string;
  icon: JSX.Element;
}

interface RoleMenuSection {
  title: string;
  items: RoleMenuItem[];
}

interface StartupState {
  loading: boolean;
  error: string | null;
  issues: string[];
}

interface StartupResources {
  users: AppUser[];
  branches: Array<{ isActive: boolean; id: string }>;
  departments: Array<{ isActive: boolean; id: string }>;
}

function hasAnyRole(user: AppUser, roles: RoleCode[]): boolean {
  return roles.some((role) => hasRole(user, role));
}

function ProtectedRoute(props: {
  currentUser: AppUser;
  requiredRoles: RoleCode[];
  children: JSX.Element;
}): JSX.Element {
  const { currentUser, requiredRoles, children } = props;

  if (!hasAnyRole(currentUser, requiredRoles)) {
    return (
      <Box p="lg">
        <AccessDeniedState requiredRoles={requiredRoles} />
      </Box>
    );
  }

  return children;
}

function getRoleMenuSections(currentUser: AppUser): RoleMenuSection[] {
  const sections: RoleMenuSection[] = [];

  if (hasRole(currentUser, "RECEPTIONIST")) {
    sections.push({
      title: "Receptionist",
      items: [
        { label: "Dashboard", to: "/receptionist/dashboard", icon: <LayoutDashboard size={16} /> },
        { label: "History", to: "/receptionist/history", icon: <History size={16} /> }
      ]
    });
  }

  if (hasRole(currentUser, "ADMIN")) {
    sections.push({
      title: "Admin",
      items: [
        { label: "User", to: "/admin/users", icon: <Users size={16} /> },
        { label: "Reference Data", to: "/admin/reference", icon: <Building2 size={16} /> },
        { label: "System Control", to: "/admin/system", icon: <Settings size={16} /> },
        { label: "System Health", to: "/admin/health", icon: <Activity size={16} /> }
      ]
    });
  }

  if (hasRole(currentUser, "DASHBOARD_VIEWER")) {
    sections.push({
      title: "Executive",
      items: [
        { label: "General Dashboard", to: "/general-dashboard", icon: <ChartColumnBig size={16} /> }
      ]
    });
  }

  if (hasRole(currentUser, "RECIPIENT") || hasRole(currentUser, "ACTION_OWNER")) {
    sections.push({
      title: "Recipient / Action Owner",
      items: [
        { label: "Action Dashboard", to: "/work/dashboard", icon: <ClipboardCheck size={16} /> }
      ]
    });
  }

  if (!hasRole(currentUser, "RECEPTIONIST")) {
    sections.push({
      title: "Search",
      items: [
        { label: "Search Correspondence", to: "/search", icon: <FileSearch size={16} /> }
      ]
    });
  }

  return sections;
}

function StartupSetupState(props: {
  currentUser: AppUser;
  issues: string[];
  error?: string | null;
}): JSX.Element {
  const { currentUser, issues, error } = props;
  const isAdmin = hasRole(currentUser, "ADMIN");

  return (
    <Alert color="yellow" title="System setup is incomplete" mb="md">
      <Text size="sm">
        {error ?? "The application started, but required first-run data is still missing."}
      </Text>
      {issues.length > 0 && (
        <Stack gap={4} mt="md">
          {issues.map((issue) => (
            <Text key={issue} size="sm">- {issue}</Text>
          ))}
        </Stack>
      )}
      <Text c="dimmed" size="sm" mt="md">
        {isAdmin
          ? "Use the Admin pages to complete setup. Operational pages remain available, but setup-dependent actions can still fail until configuration is complete."
          : "Operational pages remain available, but an administrator should complete setup before setup-dependent actions are used."}
      </Text>
    </Alert>
  );
}

async function ensureBootstrapResources(resources: StartupResources): Promise<{ resources: StartupResources; issues: string[] }> {
  const issues: string[] = [];
  let attemptedBootstrap = false;

  if (!resources.branches.some((branch) => branch.isActive)) {
    attemptedBootstrap = true;
    try {
      await runtimeHostAdapter.branches.save(bootstrapBranch);
    } catch (error) {
      issues.push(error instanceof Error ? `Default branch bootstrap failed: ${error.message}` : "Default branch bootstrap failed.");
    }
  }

  if (!resources.departments.some((department) => department.isActive)) {
    attemptedBootstrap = true;
    try {
      await runtimeHostAdapter.departments.save(bootstrapDepartment);
    } catch (error) {
      issues.push(error instanceof Error ? `Default department bootstrap failed: ${error.message}` : "Default department bootstrap failed.");
    }
  }

  if (!resources.users.some((user) => user.isActive && user.canLogin)) {
    attemptedBootstrap = true;
    try {
      await runtimeHostAdapter.users.save(fallbackAdminUser);
    } catch (error) {
      issues.push(error instanceof Error ? `Default admin bootstrap failed: ${error.message}` : "Default admin bootstrap failed.");
    }
  }

  if (!attemptedBootstrap) {
    return { resources, issues };
  }

  try {
    const [users, branches, departments] = await Promise.all([
      runtimeHostAdapter.users.findAll(),
      runtimeHostAdapter.branches.findAll(),
      runtimeHostAdapter.departments.findAll()
    ]);

    return {
      resources: {
        users,
        branches,
        departments
      },
      issues
    };
  } catch (error) {
    issues.push(error instanceof Error ? `Bootstrap verification failed: ${error.message}` : "Bootstrap verification failed.");
    return { resources, issues };
  }
}

function getDefaultRoute(currentUser: AppUser, startupIssuesPresent: boolean): string {
  if (startupIssuesPresent && hasRole(currentUser, "ADMIN")) {
    return "/admin/reference";
  }

  if (hasRole(currentUser, "RECEPTIONIST") || hasRole(currentUser, "ADMIN")) {
    return "/receptionist/dashboard";
  }

  if (hasRole(currentUser, "RECIPIENT") || hasRole(currentUser, "ACTION_OWNER")) {
    return "/work/dashboard";
  }

  if (hasRole(currentUser, "DASHBOARD_VIEWER")) {
    return "/general-dashboard";
  }

  return "/search";
}

export function App(): JSX.Element {
  const [navbarCollapsed, setNavbarCollapsed] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [availableUsers, setAvailableUsers] = useState<AppUser[]>([]);
  const [startupState, setStartupState] = useState<StartupState>({
    loading: true,
    error: null,
    issues: []
  });
  const location = useLocation();
  const platformIndicator = useMemo(() => runtimeHostAdapter.platform, []);

  useEffect(() => {
    let active = true;

    async function loadStartupData(): Promise<void> {
      try {
        setStartupState({ loading: true, error: null, issues: [] });
        const [users, branches, departments, referenceConfigs] = await Promise.all([
          runtimeHostAdapter.users.findAll(),
          runtimeHostAdapter.branches.findAll(),
          runtimeHostAdapter.departments.findAll(),
          runtimeHostAdapter.referenceConfigs.findActive()
        ]);

        if (!active) {
          return;
        }

        const bootstrapResult = await ensureBootstrapResources({
          users,
          branches,
          departments
        });
        const hydratedUsers = bootstrapResult.resources.users;
        const hydratedBranches = bootstrapResult.resources.branches;
        const hydratedDepartments = bootstrapResult.resources.departments;
        const loginUsers = hydratedUsers.filter((user) => user.isActive && user.canLogin);
        const issues: string[] = [];

        if (loginUsers.length === 0) {
          issues.push("At least one active login-enabled user is required.");
        }

        if (!hydratedBranches.some((branch) => branch.isActive)) {
          issues.push("At least one active branch is required.");
        }

        if (!hydratedDepartments.some((department) => department.isActive)) {
          issues.push("At least one active department is required.");
        }

        issues.push(...bootstrapResult.issues);

        setAvailableUsers(loginUsers);
        setCurrentUserId((current) => {
          if (current && loginUsers.some((user) => user.id === current)) {
            return current;
          }

          return loginUsers[0]?.id ?? null;
        });
        setStartupState({ loading: false, error: null, issues });
      } catch (loadError) {
        if (!active) {
          return;
        }

        const message = loadError instanceof Error ? loadError.message : "Unable to load startup data.";
        setAvailableUsers([]);
        setStartupState({ loading: false, error: message, issues: [] });
      }
    }

    void loadStartupData();

    return () => {
      active = false;
    };
  }, []);

  const currentUser = useMemo(
    () => availableUsers.find((user) => user.id === currentUserId) ?? availableUsers[0] ?? fallbackAdminUser,
    [availableUsers, currentUserId]
  );

  const roleMenuSections = useMemo(
    () => getRoleMenuSections(currentUser),
    [currentUser]
  );

  const selectableUsers = useMemo(
    () => (availableUsers.length > 0 ? availableUsers : [fallbackAdminUser]),
    [availableUsers]
  );

  async function refreshUsers(): Promise<void> {
    const users = await runtimeHostAdapter.users.findAll();
    const loginUsers = users.filter((user) => user.isActive && user.canLogin);
    setAvailableUsers(loginUsers);
    setCurrentUserId((current) => {
      if (current && loginUsers.some((user) => user.id === current)) {
        return current;
      }

      return loginUsers[0]?.id ?? null;
    });
  }

  if (startupState.loading) {
    return (
      <Box p="lg">
        <Title order={3}>Loading workspace</Title>
        <Text c="dimmed" mt="xs">
          Validating first-run setup and startup data.
        </Text>
      </Box>
    );
  }

  const startupIssuesPresent = startupState.issues.length > 0 || Boolean(startupState.error);
  const defaultRoute = getDefaultRoute(currentUser, startupIssuesPresent);

  return (
    <AppShell
      navbar={{ width: navbarCollapsed ? 84 : 320, breakpoint: "sm" }}
      padding="md"
    >
      <AppShell.Navbar p="sm">
        <Stack gap="sm" h="100%" justify="space-between">
          <Stack gap="sm">
            <Group justify="space-between" align="start" wrap="nowrap">
              {!navbarCollapsed && (
                <div>
                  <Group gap={6} align="center" wrap="nowrap">
                    <Title order={4}>Correspondence</Title>
                    <img
                      src={platformIndicator.iconDataUrl}
                      width={14}
                      height={14}
                      alt={platformIndicator.label}
                      title={`${platformIndicator.label} platform`}
                      style={{ display: "block", opacity: 0.8 }}
                    />
                  </Group>
                  <Text size="xs" c="dimmed">Operations workspace</Text>
                </div>
              )}
              {navbarCollapsed && <Search size={16} color="#6c7b90" />}
              <Burger
                opened={!navbarCollapsed}
                onClick={() => setNavbarCollapsed((current) => !current)}
                size="sm"
                aria-label="Toggle navbar collapse"
              />
            </Group>

            <Menu position="bottom-start" withArrow shadow="md" width={280} withinPortal>
              <Menu.Target>
                <UnstyledButton
                  style={{
                    width: "100%",
                    borderRadius: 10,
                    padding: "8px 10px",
                    border: "1px solid var(--mantine-color-gray-3)"
                  }}
                >
                  <Group justify="space-between" wrap="nowrap">
                    <Group gap="sm" wrap="nowrap">
                      <Avatar color="blue" radius="xl" size={navbarCollapsed ? "sm" : "md"}>
                        {currentUser.fullName
                          .split(" ")
                          .map((part) => part[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </Avatar>
                      {!navbarCollapsed && (
                        <div>
                          <Text size="sm" fw={600}>{currentUser.fullName}</Text>
                          <Text size="xs" c="dimmed">Open navigation menu</Text>
                        </div>
                      )}
                    </Group>
                    {!navbarCollapsed && <ChevronRight size={16} />}
                  </Group>
                </UnstyledButton>
              </Menu.Target>

              <Menu.Dropdown>
                {roleMenuSections.map((section, sectionIndex) => (
                  <Fragment key={section.title}>
                    <Menu.Label>{section.title}</Menu.Label>
                    {section.items.map((item) => (
                      <Menu.Item
                        key={item.to}
                        component={RouterNavLink}
                        to={item.to}
                        leftSection={item.icon}
                      >
                        {item.label}
                      </Menu.Item>
                    ))}
                    {sectionIndex < roleMenuSections.length - 1 && <Menu.Divider />}
                  </Fragment>
                ))}
              </Menu.Dropdown>
            </Menu>

            <Divider />
          </Stack>

          <Box style={{ flex: 1 }} />

          <Stack gap="xs">
            {!navbarCollapsed && (
              <Select
                value={selectableUsers.some((user) => user.id === currentUserId) ? currentUserId : currentUser.id}
                onChange={(value) => setCurrentUserId(value)}
                data={selectableUsers.map((user) => ({
                  value: user.id,
                  label: user.fullName
                }))}
                size="xs"
                leftSection={<UserCog size={14} />}
                aria-label="Select active user"
              />
            )}
          </Stack>
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>
        <Box key={location.pathname} className="workspace-main-reveal">
          {startupIssuesPresent && (
            <StartupSetupState currentUser={currentUser} issues={startupState.issues} error={startupState.error} />
          )}
          <Routes>
            <Route path="/" element={<Navigate to={defaultRoute} replace />} />

          <Route
            path="/receptionist/dashboard"
            element={
              <ProtectedRoute currentUser={currentUser} requiredRoles={["RECEPTIONIST", "ADMIN"]}>
                <ReceptionistDashboardPage currentUser={currentUser} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/receptionist/new"
            element={
              <ProtectedRoute currentUser={currentUser} requiredRoles={["RECEPTIONIST", "ADMIN"]}>
                <ReceptionistScreen currentUser={currentUser} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/receptionist/history"
            element={
              <ProtectedRoute currentUser={currentUser} requiredRoles={["RECEPTIONIST", "ADMIN"]}>
                <ReceptionistHistoryPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/work/dashboard"
            element={
              <ProtectedRoute currentUser={currentUser} requiredRoles={["RECIPIENT", "ACTION_OWNER", "ADMIN"]}>
                <WorkDashboardPage currentUser={currentUser} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tasks/assign"
            element={
              <ProtectedRoute currentUser={currentUser} requiredRoles={["RECIPIENT", "ACTION_OWNER", "ADMIN"]}>
                <TaskAssignationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tasks/action"
            element={
              <ProtectedRoute currentUser={currentUser} requiredRoles={["RECIPIENT", "ACTION_OWNER", "ADMIN"]}>
                <TakeActionPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/users"
            element={
              <ProtectedRoute currentUser={currentUser} requiredRoles={["ADMIN"]}>
                <AdminUsersPage onUsersChanged={refreshUsers} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/reference"
            element={
              <ProtectedRoute currentUser={currentUser} requiredRoles={["ADMIN"]}>
                <AdminReferenceDataPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/branches"
            element={
              <ProtectedRoute currentUser={currentUser} requiredRoles={["ADMIN"]}>
                <AdminBranchesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/departments"
            element={
              <ProtectedRoute currentUser={currentUser} requiredRoles={["ADMIN"]}>
                <AdminDepartmentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/actions"
            element={
              <ProtectedRoute currentUser={currentUser} requiredRoles={["ADMIN"]}>
                <AdminActionsCatalogPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/system"
            element={
              <ProtectedRoute currentUser={currentUser} requiredRoles={["ADMIN"]}>
                <AdminSystemControlTabPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/flow"
            element={
              <ProtectedRoute currentUser={currentUser} requiredRoles={["ADMIN"]}>
                <AdminFlowAgentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/audit"
            element={
              <ProtectedRoute currentUser={currentUser} requiredRoles={["ADMIN"]}>
                <AdminAuditLogsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/health"
            element={
              <ProtectedRoute currentUser={currentUser} requiredRoles={["ADMIN"]}>
                <AdminHealthPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/performance"
            element={
              <ProtectedRoute currentUser={currentUser} requiredRoles={["ADMIN"]}>
                <AdminPerformancePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/general-dashboard"
            element={
              <ProtectedRoute currentUser={currentUser} requiredRoles={["DASHBOARD_VIEWER", "ADMIN"]}>
                <GeneralDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/search"
            element={
              <ProtectedRoute
                currentUser={currentUser}
                requiredRoles={["ADMIN", "RECIPIENT", "ACTION_OWNER", "COPIED_VIEWER", "DASHBOARD_VIEWER"]}
              >
                <CorrespondenceSearchPage />
              </ProtectedRoute>
            }
          />

            <Route path="*" element={<Navigate to={defaultRoute} replace />} />
          </Routes>
        </Box>
      </AppShell.Main>
    </AppShell>
  );
}
