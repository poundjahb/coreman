import { AdminPageScaffold } from "./adminPageHelpers";

export function AdminFlowAgentsPage(): JSX.Element {
  return (
    <AdminPageScaffold
      title="Admin - Flow and Connected Agents"
      subtitle="Inspect flow orchestration and connected automation agents."
      rows={[
        { name: "Active Flows", value: "14", status: "Healthy" },
        { name: "Connected Agents", value: "9", status: "Healthy" },
        { name: "Failed Triggers", value: "1", status: "Investigate" }
      ]}
    />
  );
}
