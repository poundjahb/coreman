import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { AppShell, Avatar, Box, Button, Burger, Collapse, Divider, Group, Kbd, NavLink, ScrollArea, Select, Stack, Text, Title } from "@mantine/core";
import { Activity, ChartColumnBig, ClipboardCheck, Clock3, FileSearch, FolderGit2, Gauge, HandCoins, History, LayoutDashboard, ListChecks, Search, Settings, ShieldCheck, UserCog, Users, Building2, Wrench } from "lucide-react";
import { Navigate, NavLink as RouterNavLink, Route, Routes, useLocation } from "react-router-dom";
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
import { AdminActionsCatalogPage, AdminAuditLogsPage, AdminBranchesPage, AdminDepartmentsPage, AdminFlowAgentsPage, AdminHealthPage, AdminPerformancePage, AdminSystemControlPage, AdminUsersPage } from "./ui/screens/admin/AdminPages";
function hasAnyRole(user, roles) {
    return roles.some((role) => hasRole(user, role));
}
function ProtectedRoute(props) {
    const { currentUser, requiredRoles, children } = props;
    if (!hasAnyRole(currentUser, requiredRoles)) {
        return (_jsx(Box, { p: "lg", children: _jsx(AccessDeniedState, { requiredRoles: requiredRoles }) }));
    }
    return children;
}
const navSections = [
    {
        title: "Reception",
        items: [
            {
                label: "Receptionist Dashboard",
                to: "/receptionist/dashboard",
                roles: ["RECEPTIONIST", "ADMIN"],
                icon: _jsx(LayoutDashboard, { size: 16 }),
                shortcut: "1"
            },
            {
                label: "Receptionist History",
                to: "/receptionist/history",
                roles: ["RECEPTIONIST", "ADMIN"],
                icon: _jsx(History, { size: 16 }),
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
                icon: _jsx(ClipboardCheck, { size: 16 }),
                shortcut: "3"
            },
            {
                label: "Task Assignation",
                to: "/tasks/assign",
                roles: ["RECIPIENT", "ACTION_OWNER", "ADMIN"],
                icon: _jsx(ListChecks, { size: 16 })
            },
            {
                label: "Take Action",
                to: "/tasks/action",
                roles: ["RECIPIENT", "ACTION_OWNER", "ADMIN"],
                icon: _jsx(Clock3, { size: 16 })
            }
        ]
    },
    {
        title: "Administration",
        items: [
            { label: "Admin - Users", to: "/admin/users", roles: ["ADMIN"], icon: _jsx(Users, { size: 16 }) },
            {
                label: "Admin - Branches",
                to: "/admin/branches",
                roles: ["ADMIN"],
                icon: _jsx(Building2, { size: 16 })
            },
            {
                label: "Admin - Departments",
                to: "/admin/departments",
                roles: ["ADMIN"],
                icon: _jsx(Building2, { size: 16 })
            },
            { label: "Admin - Actions", to: "/admin/actions", roles: ["ADMIN"], icon: _jsx(Wrench, { size: 16 }) },
            {
                label: "Admin - System Control",
                to: "/admin/system",
                roles: ["ADMIN"],
                icon: _jsx(Settings, { size: 16 })
            },
            {
                label: "Admin - Flows and Agents",
                to: "/admin/flow",
                roles: ["ADMIN"],
                icon: _jsx(FolderGit2, { size: 16 })
            },
            { label: "Admin - Audit Logs", to: "/admin/audit", roles: ["ADMIN"], icon: _jsx(ShieldCheck, { size: 16 }) },
            { label: "Admin - Health", to: "/admin/health", roles: ["ADMIN"], icon: _jsx(Activity, { size: 16 }) },
            {
                label: "Admin - Performance",
                to: "/admin/performance",
                roles: ["ADMIN"],
                icon: _jsx(Gauge, { size: 16 })
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
                icon: _jsx(ChartColumnBig, { size: 16 }),
                shortcut: "G"
            },
            {
                label: "Correspondence Search",
                to: "/search",
                roles: ["ADMIN", "RECEPTIONIST", "RECIPIENT", "ACTION_OWNER", "COPIED_VIEWER", "DASHBOARD_VIEWER"],
                icon: _jsx(FileSearch, { size: 16 }),
                shortcut: "K"
            }
        ]
    }
];
export function App() {
    const [navbarCollapsed, setNavbarCollapsed] = useState(false);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [menuOpened, setMenuOpened] = useState(true);
    const [availableUsers, setAvailableUsers] = useState([]);
    const [usersError, setUsersError] = useState(null);
    const location = useLocation();
    const runtimePlatformTarget = useMemo(() => getRuntimePlatformTarget(), []);
    const platformIndicator = useMemo(() => getPlatformIndicator(runtimePlatformTarget), [runtimePlatformTarget]);
    useEffect(() => {
        let active = true;
        async function loadUsers() {
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
            }
            catch (loadError) {
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
    const currentUser = useMemo(() => availableUsers.find((user) => user.id === currentUserId) ?? availableUsers[0] ?? null, [availableUsers, currentUserId]);
    async function refreshUsers() {
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
        return (_jsxs(Box, { p: "lg", children: [_jsx(Title, { order: 3, children: "No active user available" }), _jsx(Text, { c: "dimmed", mt: "xs", children: usersError ?? "Seed or create at least one user record to continue." })] }));
    }
    return (_jsxs(AppShell, { navbar: { width: navbarCollapsed ? 84 : 320, breakpoint: "sm" }, padding: "md", children: [_jsx(AppShell.Navbar, { p: "sm", children: _jsxs(Stack, { gap: "sm", h: "100%", justify: "space-between", children: [_jsxs(Stack, { gap: "sm", children: [_jsxs(Group, { justify: "space-between", align: "start", wrap: "nowrap", children: [!navbarCollapsed && (_jsxs("div", { children: [_jsxs(Group, { gap: 6, align: "center", wrap: "nowrap", children: [_jsx(Title, { order: 4, children: "Correspondence" }), _jsx("img", { src: platformIndicator.iconDataUrl, width: 14, height: 14, alt: platformIndicator.label, title: `${platformIndicator.label} platform`, style: { display: "block", opacity: 0.8 } })] }), _jsx(Text, { size: "xs", c: "dimmed", children: "Operations workspace" })] })), navbarCollapsed && _jsx(Search, { size: 16, color: "#6c7b90" }), _jsx(Burger, { opened: !navbarCollapsed, onClick: () => setNavbarCollapsed((current) => !current), size: "sm", "aria-label": "Toggle navbar collapse" })] }), _jsxs(Group, { wrap: "nowrap", align: "center", children: [_jsx(Avatar, { color: "blue", radius: "xl", size: navbarCollapsed ? "sm" : "md", children: currentUser.fullName
                                                .split(" ")
                                                .map((part) => part[0])
                                                .join("")
                                                .slice(0, 2)
                                                .toUpperCase() }), !navbarCollapsed && (_jsxs("div", { children: [_jsx(Text, { size: "sm", fw: 600, children: currentUser.fullName }), _jsx(Text, { size: "xs", c: "dimmed", children: currentUser.roles.join(", ") })] }))] }), _jsx(Divider, {})] }), _jsx(ScrollArea, { offsetScrollbars: true, className: "navbar-content-scroll", children: navbarCollapsed ? (_jsx(Stack, { gap: 6, align: "stretch", children: navSections.flatMap((section) => section.items).map((item) => {
                                    const canAccess = !item.roles || hasAnyRole(currentUser, item.roles);
                                    const active = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
                                    return (_jsx(NavLink, { component: RouterNavLink, to: item.to, active: active, disabled: !canAccess, leftSection: item.icon, label: "", style: { borderRadius: 8 } }, item.to));
                                }) })) : (_jsxs(Stack, { gap: "sm", children: [_jsx(Button, { onClick: () => setMenuOpened((current) => !current), variant: "light", fullWidth: true, radius: "md", leftSection: _jsx(HandCoins, { size: 16 }), children: "Toggle menu" }), _jsx(Collapse, { in: menuOpened, transitionDuration: 180, children: _jsx(Stack, { className: "sidebar-menu-panel", gap: "xs", children: navSections.map((section, index) => (_jsxs(Box, { className: "menu-section-reveal", style: { animationDelay: `${index * 45}ms` }, children: [_jsx(Text, { className: "sidebar-menu-title", children: section.title }), _jsx(Stack, { gap: 2, children: section.items.map((item) => {
                                                            const canAccess = !item.roles || hasAnyRole(currentUser, item.roles);
                                                            const active = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
                                                            return (_jsx(NavLink, { component: RouterNavLink, to: item.to, label: item.label, leftSection: item.icon, rightSection: active && item.shortcut ? (_jsx(Kbd, { size: "xs", children: item.shortcut })) : null, active: active, disabled: !canAccess, className: "menu-link-motion", variant: "subtle", style: { borderRadius: 8, paddingInline: 8, paddingBlock: 4 } }, item.to));
                                                        }) }), index < navSections.length - 1 && _jsx(Divider, { my: "xs" })] }, section.title))) }) })] })) }), _jsx(Stack, { gap: "xs", children: !navbarCollapsed && (_jsx(Select, { value: currentUserId, onChange: (value) => setCurrentUserId(value), data: availableUsers.map((user) => ({
                                    value: user.id,
                                    label: `${user.fullName} (${user.roles.join(", ")})`
                                })), size: "xs", leftSection: _jsx(UserCog, { size: 14 }), "aria-label": "Select active user" })) })] }) }), _jsx(AppShell.Main, { children: _jsx(Box, { className: "workspace-main-reveal", children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(Navigate, { to: "/receptionist/dashboard", replace: true }) }), _jsx(Route, { path: "/receptionist/dashboard", element: _jsx(ProtectedRoute, { currentUser: currentUser, requiredRoles: ["RECEPTIONIST", "ADMIN"], children: _jsx(ReceptionistDashboardPage, { currentUser: currentUser }) }) }), _jsx(Route, { path: "/receptionist/new", element: _jsx(ProtectedRoute, { currentUser: currentUser, requiredRoles: ["RECEPTIONIST", "ADMIN"], children: _jsx(ReceptionistScreen, { currentUser: currentUser }) }) }), _jsx(Route, { path: "/receptionist/history", element: _jsx(ProtectedRoute, { currentUser: currentUser, requiredRoles: ["RECEPTIONIST", "ADMIN"], children: _jsx(ReceptionistHistoryPage, {}) }) }), _jsx(Route, { path: "/work/dashboard", element: _jsx(ProtectedRoute, { currentUser: currentUser, requiredRoles: ["RECIPIENT", "ACTION_OWNER", "ADMIN"], children: _jsx(WorkDashboardPage, { currentUser: currentUser }) }) }), _jsx(Route, { path: "/tasks/assign", element: _jsx(ProtectedRoute, { currentUser: currentUser, requiredRoles: ["RECIPIENT", "ACTION_OWNER", "ADMIN"], children: _jsx(TaskAssignationPage, {}) }) }), _jsx(Route, { path: "/tasks/action", element: _jsx(ProtectedRoute, { currentUser: currentUser, requiredRoles: ["RECIPIENT", "ACTION_OWNER", "ADMIN"], children: _jsx(TakeActionPage, {}) }) }), _jsx(Route, { path: "/admin/users", element: _jsx(ProtectedRoute, { currentUser: currentUser, requiredRoles: ["ADMIN"], children: _jsx(AdminUsersPage, { onUsersChanged: refreshUsers }) }) }), _jsx(Route, { path: "/admin/branches", element: _jsx(ProtectedRoute, { currentUser: currentUser, requiredRoles: ["ADMIN"], children: _jsx(AdminBranchesPage, {}) }) }), _jsx(Route, { path: "/admin/departments", element: _jsx(ProtectedRoute, { currentUser: currentUser, requiredRoles: ["ADMIN"], children: _jsx(AdminDepartmentsPage, {}) }) }), _jsx(Route, { path: "/admin/actions", element: _jsx(ProtectedRoute, { currentUser: currentUser, requiredRoles: ["ADMIN"], children: _jsx(AdminActionsCatalogPage, {}) }) }), _jsx(Route, { path: "/admin/system", element: _jsx(ProtectedRoute, { currentUser: currentUser, requiredRoles: ["ADMIN"], children: _jsx(AdminSystemControlPage, {}) }) }), _jsx(Route, { path: "/admin/flow", element: _jsx(ProtectedRoute, { currentUser: currentUser, requiredRoles: ["ADMIN"], children: _jsx(AdminFlowAgentsPage, {}) }) }), _jsx(Route, { path: "/admin/audit", element: _jsx(ProtectedRoute, { currentUser: currentUser, requiredRoles: ["ADMIN"], children: _jsx(AdminAuditLogsPage, {}) }) }), _jsx(Route, { path: "/admin/health", element: _jsx(ProtectedRoute, { currentUser: currentUser, requiredRoles: ["ADMIN"], children: _jsx(AdminHealthPage, {}) }) }), _jsx(Route, { path: "/admin/performance", element: _jsx(ProtectedRoute, { currentUser: currentUser, requiredRoles: ["ADMIN"], children: _jsx(AdminPerformancePage, {}) }) }), _jsx(Route, { path: "/general-dashboard", element: _jsx(ProtectedRoute, { currentUser: currentUser, requiredRoles: ["DASHBOARD_VIEWER", "ADMIN"], children: _jsx(GeneralDashboardPage, {}) }) }), _jsx(Route, { path: "/search", element: _jsx(ProtectedRoute, { currentUser: currentUser, requiredRoles: ["ADMIN", "RECEPTIONIST", "RECIPIENT", "ACTION_OWNER", "COPIED_VIEWER", "DASHBOARD_VIEWER"], children: _jsx(CorrespondenceSearchPage, {}) }) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/receptionist/dashboard", replace: true }) })] }) }, location.pathname) })] }));
}
