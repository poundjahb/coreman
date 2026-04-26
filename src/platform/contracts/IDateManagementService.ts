import type { DateManagementThresholds } from "../../domain/dateManagement";

export interface IDateManagementService {
  getThresholds(): Promise<DateManagementThresholds>;
  saveThresholds(thresholds: DateManagementThresholds): Promise<void>;
}
