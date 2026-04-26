# UI Feature Baseline

| Screen title shown to user | Purpose | Access route | Roles that can access |
|---|---|---|---|
| Correspondence Management | Sign-in page for workspace access in SERVER mode. | Authentication\Sign in | Unauthenticated users (SERVER mode) |
| Receptionist Dashboard | Daily receptionist queue with quick registration actions. ADMIN can view correspondences recorded by any receptionist; RECEPTIONIST can view only correspondences they recorded. | Receptionist\Dashboard | RECEPTIONIST, ADMIN |
| Register Incoming Correspondence / Register Outgoing Correspondence | Register new correspondence and route it to staff or department. | Receptionist\Dashboard\New Incoming or New Outgoing | RECEPTIONIST, ADMIN |
| Receptionist Correspondence History | Review previously registered correspondence with filters. ADMIN can view correspondences recorded by any receptionist; RECEPTIONIST can view only correspondences they recorded. | Receptionist\History | RECEPTIONIST, ADMIN |
| My correspondences Dashboard | Individual work queue. For RECIPIENT and ADMIN, only correspondences assigned to the logged-in user (as recipient or action owner) are listed. | Recipient\Action Dashboard | RECIPIENT, ADMIN |
| Task Assignation | Create and assign action tasks with deadline and CC users. | Recipient\Action Dashboard\Assign Task | RECIPIENT, ADMIN |
| Take Action | Update assignment status, deadline, comments, and attachments. | Recipient\Action Dashboard\Take Action | RECIPIENT, ADMIN |
| General Correspondence Dashboard | Executive-level KPI and branch performance overview. | Executive\General Dashboard | EXECUTIVE, ADMIN |
| Correspondence Search | Organization-wide correspondence lookup by filters. ADMIN and EXECUTIVE can search/view any correspondence. RECIPIENT can view only correspondences assigned to them as recipient or action owner. | Search\Search Correspondence | ADMIN, RECIPIENT, EXECUTIVE |
| Admin - Users | Manage users, roles, and account access settings. | Admin\User | ADMIN |
| Admin - Reference Data | Entry point for branch and department reference management. | Admin\Reference Data | ADMIN |
| Admin - Branches | Create/update/activate branch records. | Admin\Reference Data\Branches | ADMIN |
| Admin - Departments | Create/update/activate department records. | Admin\Reference Data\Departments | ADMIN |
| Admin - System Control | Entry point for system-level settings and actions configuration. | Admin\System Control | ADMIN |
| Email Settings | Configure SMTP/Graph/Resend and send test email. | Admin\System Control\Email Settings | ADMIN |
| Admin - Actions Catalog | Configure reusable action definitions and workflow behavior. | Admin\System Control\Actions | ADMIN |
| Admin - Flow and Connected Agents | Monitor connected flow/agent operational status. | Admin\Flow and Connected Agents | ADMIN |
| Admin - Audit Logs | Review platform events and sensitive activity history. | Admin\Audit Logs | ADMIN |
| Admin - System Health | Track service/dependency health indicators. | Admin\System Health | ADMIN |
| Admin - Performance | Monitor response, throughput, and error trends. | Admin\Performance | ADMIN |

## Route Mapping (Optional Appendix)

| Screen title shown to user | URL route |
|---|---|
| Receptionist Dashboard | /receptionist/dashboard |
| Register Incoming/Outgoing Correspondence | /receptionist/new |
| Receptionist Correspondence History | /receptionist/history |
| My correspondences Dashboard | /work/dashboard |
| Task Assignation | /tasks/assign |
| Take Action | /tasks/action |
| General Correspondence Dashboard | /general-dashboard |
| Correspondence Search | /search |
| Admin - Users | /admin/users |
| Admin - Reference Data | /admin/reference |
| Admin - Branches | /admin/branches |
| Admin - Departments | /admin/departments |
| Admin - Actions Catalog | /admin/actions |
| Admin - System Control | /admin/system |
| Admin - Flow and Connected Agents | /admin/flow |
| Admin - Audit Logs | /admin/audit |
| Admin - System Health | /admin/health |
| Admin - Performance | /admin/performance |

Source files used:
- App.tsx
- LoginPage.tsx
- ReceptionistDashboardPage.tsx
- ReceptionistScreen.tsx
- ReceptionistHistoryPage.tsx
- WorkDashboardPage.tsx
- TaskAssignationPage.tsx
- TakeActionPage.tsx
- GeneralDashboardPage.tsx
- CorrespondenceSearchPage.tsx
- AdminPages.tsx
- AdminUsersPage.tsx
- AdminBranchesPage.tsx
- AdminDepartmentsPage.tsx
- AdminActionsCatalogPage.tsx
- AdminEmailSettingsPage.tsx
- AdminFlowAgentsPage.tsx
- AdminAuditLogsPage.tsx
- AdminHealthPage.tsx
- AdminPerformancePage.tsx

