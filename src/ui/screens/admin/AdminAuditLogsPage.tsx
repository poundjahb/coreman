import { AdminPageScaffold } from "./adminPageHelpers";

export function AdminAuditLogsPage(): JSX.Element {
  return (
    <AdminPageScaffold
      title="Admin - Audit Logs"
      subtitle="Review platform events, user activities, and policy-sensitive operations."
      rows={[
        { name: "Events Today", value: "1,843", status: "Ingesting" },
        { name: "Privileged Events", value: "57", status: "Monitored" },
        { name: "Alerted Events", value: "2", status: "Review" }
      ]}
    />
  );
}
