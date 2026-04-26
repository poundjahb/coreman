import type { DateManagementThresholds } from "../../../domain/dateManagement";
import { runtimeHostAdapter } from "../../../platform/runtimeHostAdapter";

export async function loadDateManagementThresholds(): Promise<DateManagementThresholds> {
  return runtimeHostAdapter.dateManagement.getThresholds();
}

export async function saveDateManagementThresholds(thresholds: DateManagementThresholds): Promise<void> {
  await runtimeHostAdapter.dateManagement.saveThresholds(thresholds);
}
