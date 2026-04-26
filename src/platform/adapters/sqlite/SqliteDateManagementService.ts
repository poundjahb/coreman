import type { Database } from "better-sqlite3";
import {
  defaultDateManagementThresholds,
  type DateManagementThresholds,
  validateDateManagementThresholds
} from "../../../domain/dateManagement";
import type { IDateManagementService } from "../../contracts/IDateManagementService";

type DateManagementRow = {
  assignmentReminderDays: number;
  assignmentEscalationDays: number;
  assignmentAutoCloseDays: number;
  recipientInactionReminderDays: number;
  recipientInactionEscalationDays: number;
  recipientInactionAutoCloseDays: number;
};

function rowToThresholds(row: DateManagementRow): DateManagementThresholds {
  return {
    assignmentThresholds: {
      reminderDays: row.assignmentReminderDays,
      escalationDays: row.assignmentEscalationDays,
      autoCloseDays: row.assignmentAutoCloseDays
    },
    recipientInactionThresholds: {
      reminderDays: row.recipientInactionReminderDays,
      escalationDays: row.recipientInactionEscalationDays,
      autoCloseDays: row.recipientInactionAutoCloseDays
    }
  };
}

export class SqliteDateManagementService implements IDateManagementService {
  constructor(private readonly db: Database) {}

  async getThresholds(): Promise<DateManagementThresholds> {
    const row = this.db.prepare(
      `SELECT
         assignmentReminderDays,
         assignmentEscalationDays,
         assignmentAutoCloseDays,
         recipientInactionReminderDays,
         recipientInactionEscalationDays,
         recipientInactionAutoCloseDays
       FROM date_management_settings
       WHERE id = 1`
    ).get() as DateManagementRow | undefined;

    if (!row) {
      return JSON.parse(JSON.stringify(defaultDateManagementThresholds)) as DateManagementThresholds;
    }

    return rowToThresholds(row);
  }

  async saveThresholds(thresholds: DateManagementThresholds): Promise<void> {
    const errors = validateDateManagementThresholds(thresholds);
    if (errors.length > 0) {
      throw new Error(errors.join(" "));
    }

    this.db.prepare(
      `INSERT INTO date_management_settings (
        id,
        assignmentReminderDays,
        assignmentEscalationDays,
        assignmentAutoCloseDays,
        recipientInactionReminderDays,
        recipientInactionEscalationDays,
        recipientInactionAutoCloseDays,
        updatedAt
      ) VALUES (
        1,
        @assignmentReminderDays,
        @assignmentEscalationDays,
        @assignmentAutoCloseDays,
        @recipientInactionReminderDays,
        @recipientInactionEscalationDays,
        @recipientInactionAutoCloseDays,
        @updatedAt
      )
      ON CONFLICT(id)
      DO UPDATE SET
        assignmentReminderDays = excluded.assignmentReminderDays,
        assignmentEscalationDays = excluded.assignmentEscalationDays,
        assignmentAutoCloseDays = excluded.assignmentAutoCloseDays,
        recipientInactionReminderDays = excluded.recipientInactionReminderDays,
        recipientInactionEscalationDays = excluded.recipientInactionEscalationDays,
        recipientInactionAutoCloseDays = excluded.recipientInactionAutoCloseDays,
        updatedAt = excluded.updatedAt`
    ).run({
      assignmentReminderDays: thresholds.assignmentThresholds.reminderDays,
      assignmentEscalationDays: thresholds.assignmentThresholds.escalationDays,
      assignmentAutoCloseDays: thresholds.assignmentThresholds.autoCloseDays,
      recipientInactionReminderDays: thresholds.recipientInactionThresholds.reminderDays,
      recipientInactionEscalationDays: thresholds.recipientInactionThresholds.escalationDays,
      recipientInactionAutoCloseDays: thresholds.recipientInactionThresholds.autoCloseDays,
      updatedAt: new Date().toISOString()
    });
  }
}
