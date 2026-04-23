import { AdminPageScaffold } from "./adminPageHelpers";

export function AdminHealthPage(): JSX.Element {
  return (
    <AdminPageScaffold
      title="Admin - System Health"
      subtitle="Monitor service health, dependency status, and environment quality indicators."
      rows={[
        { name: "CPU Usage", value: "47%", status: "Normal" },
        { name: "Memory Usage", value: "61%", status: "Normal" },
        { name: "Database Latency", value: "18 ms", status: "Healthy" }
      ]}
    />
  );
}
