import { AdminPageScaffold } from "./adminPageHelpers";

export function AdminPerformancePage(): JSX.Element {
  return (
    <AdminPageScaffold
      title="Admin - Performance"
      subtitle="Evaluate throughput, latency, and system efficiency over time."
      rows={[
        { name: "Average Response", value: "263 ms", status: "Good" },
        { name: "Peak Throughput", value: "122 req/s", status: "Stable" },
        { name: "Error Rate", value: "0.4%", status: "Healthy" }
      ]}
    />
  );
}
