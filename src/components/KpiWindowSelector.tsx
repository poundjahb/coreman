import { SegmentedControl } from "@mantine/core";

export type KpiWindow = "today" | "week" | "month";

interface KpiWindowSelectorProps {
  value: KpiWindow;
  onChange: (value: KpiWindow) => void;
}

export function KpiWindowSelector({ value, onChange }: KpiWindowSelectorProps): JSX.Element {
  return (
    <SegmentedControl
      value={value}
      onChange={(v) => {
        if (v === "today" || v === "week" || v === "month") {
          onChange(v);
        }
      }}
      data={[
        { label: "Today", value: "today" },
        { label: "This Week", value: "week" },
        { label: "This Month", value: "month" }
      ]}
    />
  );
}
