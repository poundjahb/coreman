import { jsx as _jsx } from "react/jsx-runtime";
import { SegmentedControl } from "@mantine/core";
export function KpiWindowSelector({ value, onChange }) {
    return (_jsx(SegmentedControl, { value: value, onChange: (v) => {
            if (v === "today" || v === "week" || v === "month") {
                onChange(v);
            }
        }, data: [
            { label: "Today", value: "today" },
            { label: "This Week", value: "week" },
            { label: "This Month", value: "month" }
        ] }));
}
