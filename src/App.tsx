import { Fragment, useEffect, useMemo, useState } from "react";
import {
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
import { getPlatformIndicator } from "./platform/hostAdapterFactory";
import { getRuntimePlatformTarget } from "./platform/runtimePlatformTarget";
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

interface RoleMenuItem {
  label: string;
  to: string;
  icon: JSX.Element;
}

interface RoleMenuSection {
  title: string;
  items: RoleMenuItem[];
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

export function App(): JSX.Element {
  const [navbarCollapsed, setNavbarCollapsed] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [availableUsers, setAvailableUsers] = useState<AppUser[]>([]);
  const [usersError, setUsersError] = useState<string | null>(null);
  const location = useLocation();
  const runtimePlatformTarget = useMemo(() => getRuntimePlatformTarget(), []);
  const platformIndicator = useMemo(
    () => getPlatformIndicator(runtimePlatformTarget),
    [runtimePlatformTarget]
  );

  useEffect(() => {
    let active = true;

    async function loadUsers(): Promise<void> {
      try {
        setUsersError(null);
        const users = await runtimeHostAdapter.users.findAll();

        if (!active) {
          return;
        }

        setAvailableUsers(users);
        setCurrentUserId((current) => {
          if (current && users.some((user) => user.id === current)) {
            return current;
          }

          return users[0]?.id ?? null;
        });
      } catch (loadError) {
        if (!active) {
          return;
        }

        setUsersError(loadError instanceof Error ? loadError.message : "Unable to load users.");
      }
    }

    void loadUsers();

    return () => {
      active = false;
    };
  }, []);

  const currentUser = useMemo(
    () => availableUsers.find((user) => user.id === currentUserId) ?? availableUsers[0] ?? null,
    [availableUsers, currentUserId]
  );

  const roleMenuSections = useMemo(
    () => (currentUser ? getRoleMenuSections(currentUser) : []),
    [currentUser]
  );

  async function refreshUsers(): Promise<void> {
    const users = await runtimeHostAdapter.users.findAll();
    setAvailableUsers(users);
    setCurrentUserId((current) => {
      if (current && users.some((user) => user.id === current)) {
        return current;
      }

      return users[0]?.id ?? null;
    });
  }

  if (!currentUser) {
    return (
      <Box p="lg">
        <Title order={3}>No active user available</Title>
        <Text c="dimmed" mt="xs">
          {usersError ?? "Seed or create at least one user record to continue."}
        </Text>
      </Box>
    );
  }

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
                value={currentUserId}
                onChange={(value) => setCurrentUserId(value)}
                data={availableUsers.map((user) => ({
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
          <Routes>
            <Route path="/" element={<Navigate to="/receptionist/dashboard" replace />} />

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

            <Route path="*" element={<Navigate to="/receptionist/dashboard" replace />} />
          </Routes>
        </Box>
      </AppShell.Main>
    </AppShell>
  );
}
