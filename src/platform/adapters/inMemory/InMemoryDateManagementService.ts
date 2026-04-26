import {
  defaultDateManagementThresholds,
  type DateManagementThresholds,
  validateDateManagementThresholds
} from "../../../domain/dateManagement";
import type { IDateManagementService } from "../../contracts/IDateManagementService";

export class InMemoryDateManagementService implements IDateManagementService {
  private settings: DateManagementThresholds = { ...defaultDateManagementThresholds };

  async getThresholds(): Promise<DateManagementThresholds> {
    return JSON.parse(JSON.stringify(this.settings)) as DateManagementThresholds;
  }

  async saveThresholds(thresholds: DateManagementThresholds): Promise<void> {
    const errors = validateDateManagementThresholds(thresholds);
    if (errors.length > 0) {
      throw new Error(errors.join(" "));
    }

    this.settings = JSON.parse(JSON.stringify(thresholds)) as DateManagementThresholds;
  }
}
