import { useMemo, useState } from "react";
import {
  AppShell,
  Avatar,
  Box,
  Button,
  Burger,
  Collapse,
  Divider,
  Group,
  Kbd,
  NavLink,
  ScrollArea,
  Select,
  Stack,
  Text,
  Title
} from "@mantine/core";
import {
  Activity,
  ChartColumnBig,
  ClipboardCheck,
  Clock3,
  FileSearch,
  FolderGit2,
  Gauge,
  HandCoins,
  History,
  LayoutDashboard,
  ListChecks,
  Search,
  Settings,
  ShieldCheck,
  UserCog,
  Users,
  Building2,
  Wrench
} from "lucide-react";
import { Navigate, NavLink as RouterNavLink, Route, Routes, useLocation } from "react-router-dom";
import type { AppUser, RoleCode } from "./domain/governance";
import { hasRole } from "./application/services/accessControl";
import { demoUsers } from "./application/modules/admin/seedData";
import { getPlatformIndicator } from "./platform/hostAdapterFactory";
import { getRuntimePlatformTarget } from "./platform/runtimePlatformTarget";
import { AccessDeniedState } from "./ui/components/AccessDeniedState";
import { ReceptionistDashboardPage } from "./ui/screens/ReceptionistDashboardPage";
import { ReceptionistHistoryPage } from "./ui/screens/ReceptionistHistoryPage";
import { WorkDashboardPage } from "./ui/screens/WorkDashboardPage";
import { TaskAssignationPage } from "./ui/screens/TaskAssignationPage";
import { TakeActionPage } from "./ui/screens/TakeActionPage";
import { GeneralDashboardPage } from "./ui/screens/GeneralDashboardPage";
import { CorrespondenceSearchPage } from "./ui/screens/CorrespondenceSearchPage";
import {
  AdminActionsCatalogPage,
  AdminAuditLogsPage,
  AdminDepartmentsPage,
  AdminFlowAgentsPage,
  AdminHealthPage,
  AdminPerformancePage,
  AdminSystemControlPage,
  AdminUsersPage
} from "./ui/screens/admin/AdminPages";

interface NavItem {
  label: string;
  to: string;
  roles?: RoleCode[];
  icon: JSX.Element;
  shortcut?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
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

const navSections: NavSection[] = [
  {
    title: "Reception",
    items: [
      {
        label: "Receptionist Dashboard",
        to: "/receptionist/dashboard",
        roles: ["RECEPTIONIST", "ADMIN"],
        icon: <LayoutDashboard size={16} />,
        shortcut: "1"
      },
      {
        label: "Receptionist History",
        to: "/receptionist/history",
        roles: ["RECEPTIONIST", "ADMIN"],
        icon: <History size={16} />,
        shortcut: "2"
      }
    ]
  },
  {
    title: "Workflows",
    items: [
      {
        label: "Recipient/Owner Dashboard",
        to: "/work/dashboard",
        roles: ["RECIPIENT", "ACTION_OWNER", "ADMIN"],
        icon: <ClipboardCheck size={16} />,
        shortcut: "3"
      },
      {
        label: "Task Assignation",
        to: "/tasks/assign",
        roles: ["RECIPIENT", "ACTION_OWNER", "ADMIN"],
        icon: <ListChecks size={16} />
      },
      {
        label: "Take Action",
        to: "/tasks/action",
        roles: ["RECIPIENT", "ACTION_OWNER", "ADMIN"],
        icon: <Clock3 size={16} />
      }
    ]
  },
  {
    title: "Administration",
    items: [
      { label: "Admin - Users", to: "/admin/users", roles: ["ADMIN"], icon: <Users size={16} /> },
      {
        label: "Admin - Departments",
        to: "/admin/departments",
        roles: ["ADMIN"],
        icon: <Building2 size={16} />
      },
      { label: "Admin - Actions", to: "/admin/actions", roles: ["ADMIN"], icon: <Wrench size={16} /> },
      {
        label: "Admin - System Control",
        to: "/admin/system",
        roles: ["ADMIN"],
        icon: <Settings size={16} />
      },
      {
        label: "Admin - Flows and Agents",
        to: "/admin/flow",
        roles: ["ADMIN"],
        icon: <FolderGit2 size={16} />
      },
      { label: "Admin - Audit Logs", to: "/admin/audit", roles: ["ADMIN"], icon: <ShieldCheck size={16} /> },
      { label: "Admin - Health", to: "/admin/health", roles: ["ADMIN"], icon: <Activity size={16} /> },
      {
        label: "Admin - Performance",
        to: "/admin/performance",
        roles: ["ADMIN"],
        icon: <Gauge size={16} />
      }
    ]
  },
  {
    title: "Executive",
    items: [
      {
        label: "General Dashboard",
        to: "/general-dashboard",
        roles: ["DASHBOARD_VIEWER", "ADMIN"],
        icon: <ChartColumnBig size={16} />,
        shortcut: "G"
      },
      {
        label: "Correspondence Search",
        to: "/search",
        roles: ["ADMIN", "RECEPTIONIST", "RECIPIENT", "ACTION_OWNER", "COPIED_VIEWER", "DASHBOARD_VIEWER"],
        icon: <FileSearch size={16} />,
        shortcut: "K"
      }
    ]
  }
];

export function App(): JSX.Element {
  const [navbarCollapsed, setNavbarCollapsed] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>(demoUsers[0].id);
  const [menuOpened, setMenuOpened] = useState(true);
  const location = useLocation();
  const runtimePlatformTarget = useMemo(() => getRuntimePlatformTarget(), []);
  const platformIndicator = useMemo(
    () => getPlatformIndicator(runtimePlatformTarget),
    [runtimePlatformTarget]
  );

  const currentUser = useMemo(
    () => demoUsers.find((user) => user.id === currentUserId) ?? demoUsers[0],
    [currentUserId]
  );

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

            <Group wrap="nowrap" align="center">
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
                  <Text size="xs" c="dimmed">{currentUser.roles.join(", ")}</Text>
                </div>
              )}
            </Group>

            <Divider />
          </Stack>

          <ScrollArea offsetScrollbars className="navbar-content-scroll">
            {navbarCollapsed ? (
              <Stack gap={6} align="stretch">
                {navSections.flatMap((section) => section.items).map((item) => {
                  const canAccess = !item.roles || hasAnyRole(currentUser, item.roles);
                  const active =
                    location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);

                  return (
                    <NavLink
                      key={item.to}
                      component={RouterNavLink}
                      to={item.to}
                      active={active}
                      disabled={!canAccess}
                      leftSection={item.icon}
                      label=""
                      style={{ borderRadius: 8 }}
                    />
                  );
                })}
              </Stack>
            ) : (
              <Stack gap="sm">
                <Button
                  onClick={() => setMenuOpened((current) => !current)}
                  variant="light"
                  fullWidth
                  radius="md"
                  leftSection={<HandCoins size={16} />}
                >
                  Toggle menu
                </Button>

                <Collapse in={menuOpened} transitionDuration={180}>
                  <Stack className="sidebar-menu-panel" gap="xs">
                    {navSections.map((section, index) => (
                      <Box key={section.title} className="menu-section-reveal" style={{ animationDelay: `${index * 45}ms` }}>
                        <Text className="sidebar-menu-title">{section.title}</Text>
                        <Stack gap={2}>
                          {section.items.map((item) => {
                            const canAccess = !item.roles || hasAnyRole(currentUser, item.roles);
                            const active =
                              location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);

                            return (
                              <NavLink
                                key={item.to}
                                component={RouterNavLink}
                                to={item.to}
                                label={item.label}
                                leftSection={item.icon}
                                rightSection={
                                  active && item.shortcut ? (
                                    <Kbd size="xs">{item.shortcut}</Kbd>
                                  ) : null
                                }
                                active={active}
                                disabled={!canAccess}
                                className="menu-link-motion"
                                variant="subtle"
                                style={{ borderRadius: 8, paddingInline: 8, paddingBlock: 4 }}
                              />
                            );
                          })}
                        </Stack>
                        {index < navSections.length - 1 && <Divider my="xs" />}
                      </Box>
                    ))}
                  </Stack>
                </Collapse>
              </Stack>
            )}
          </ScrollArea>

          <Stack gap="xs">
            {!navbarCollapsed && (
              <Select
                value={currentUserId}
                onChange={(value) => setCurrentUserId(value ?? demoUsers[0].id)}
                data={demoUsers.map((user) => ({
                  value: user.id,
                  label: `${user.fullName} (${user.roles.join(", ")})`
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
                <ReceptionistDashboardPage />
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
                <AdminUsersPage />
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
                <AdminSystemControlPage />
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
                requiredRoles={["ADMIN", "RECEPTIONIST", "RECIPIENT", "ACTION_OWNER", "COPIED_VIEWER", "DASHBOARD_VIEWER"]}
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
