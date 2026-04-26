import type { Request, Response, Router } from "express";
import type Database from "better-sqlite3";

type DateThresholdGroup = {
  reminderDays: number;
  escalationDays: number;
  autoCloseDays: number;
};

type DateManagementThresholds = {
  assignmentThresholds: DateThresholdGroup;
  recipientInactionThresholds: DateThresholdGroup;
};

const defaultDateManagementThresholds: DateManagementThresholds = {
  assignmentThresholds: {
    reminderDays: 2,
    escalationDays: 5,
    autoCloseDays: 10
  },
  recipientInactionThresholds: {
    reminderDays: 2,
    escalationDays: 5,
    autoCloseDays: 10
  }
};

type DateManagementRow = {
  assignmentReminderDays: number;
  assignmentEscalationDays: number;
  assignmentAutoCloseDays: number;
  recipientInactionReminderDays: number;
  recipientInactionEscalationDays: number;
  recipientInactionAutoCloseDays: number;
};

function isNonNegativeInteger(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

function validateGroup(group: DateThresholdGroup, label: string): string[] {
  const errors: string[] = [];

  if (!isNonNegativeInteger(group.reminderDays)) {
    errors.push(`${label}.reminderDays must be a non-negative integer.`);
  }
  if (!isNonNegativeInteger(group.escalationDays)) {
    errors.push(`${label}.escalationDays must be a non-negative integer.`);
  }
  if (!isNonNegativeInteger(group.autoCloseDays)) {
    errors.push(`${label}.autoCloseDays must be a non-negative integer.`);
  }

  if (group.reminderDays > group.escalationDays) {
    errors.push(`${label}.reminderDays must be less than or equal to ${label}.escalationDays.`);
  }
  if (group.escalationDays > group.autoCloseDays) {
    errors.push(`${label}.escalationDays must be less than or equal to ${label}.autoCloseDays.`);
  }

  return errors;
}

export function validateDateManagementSettingsPayload(payload: unknown): { value: DateManagementThresholds | null; errors: string[] } {
  if (typeof payload !== "object" || payload === null) {
    return { value: null, errors: ["Request payload must be an object."] };
  }

  const candidate = payload as Partial<DateManagementThresholds>;
  if (!candidate.assignmentThresholds || !candidate.recipientInactionThresholds) {
    return {
      value: null,
      errors: ["assignmentThresholds and recipientInactionThresholds are required."]
    };
  }

  const settings: DateManagementThresholds = {
    assignmentThresholds: {
      reminderDays: Number(candidate.assignmentThresholds.reminderDays),
      escalationDays: Number(candidate.assignmentThresholds.escalationDays),
      autoCloseDays: Number(candidate.assignmentThresholds.autoCloseDays)
    },
    recipientInactionThresholds: {
      reminderDays: Number(candidate.recipientInactionThresholds.reminderDays),
      escalationDays: Number(candidate.recipientInactionThresholds.escalationDays),
      autoCloseDays: Number(candidate.recipientInactionThresholds.autoCloseDays)
    }
  };

  const errors = [
    ...validateGroup(settings.assignmentThresholds, "assignmentThresholds"),
    ...validateGroup(settings.recipientInactionThresholds, "recipientInactionThresholds")
  ];
  return {
    value: errors.length === 0 ? settings : null,
    errors
  };
}

function rowToSettings(row: DateManagementRow): DateManagementThresholds {
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

export function getStoredDateManagementSettings(db: Database.Database): DateManagementThresholds {
  const row = db.prepare(
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

  return row ? rowToSettings(row) : defaultDateManagementThresholds;
}

export function saveDateManagementSettings(db: Database.Database, settings: DateManagementThresholds): void {
  db.prepare(
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
    assignmentReminderDays: settings.assignmentThresholds.reminderDays,
    assignmentEscalationDays: settings.assignmentThresholds.escalationDays,
    assignmentAutoCloseDays: settings.assignmentThresholds.autoCloseDays,
    recipientInactionReminderDays: settings.recipientInactionThresholds.reminderDays,
    recipientInactionEscalationDays: settings.recipientInactionThresholds.escalationDays,
    recipientInactionAutoCloseDays: settings.recipientInactionThresholds.autoCloseDays,
    updatedAt: new Date().toISOString()
  });
}

export function registerDateManagementRoutes(router: Router, db: Database.Database): void {
  router.get("/api/date-management-settings", (_req: Request, res: Response) => {
    try {
      res.json(getStoredDateManagementSettings(db));
    } catch (error) {
      console.error("Error loading date management settings:", error);
      res.status(500).json({ error: "Failed to load date management settings" });
    }
  });

  router.put("/api/date-management-settings", (req: Request, res: Response) => {
    try {
      const { value, errors } = validateDateManagementSettingsPayload(req.body);
      if (!value) {
        res.status(400).json({ error: errors.join(" ") });
        return;
      }

      saveDateManagementSettings(db, value);

      res.status(200).json({ message: "Date management settings updated" });
    } catch (error) {
      console.error("Error saving date management settings:", error);
      res.status(500).json({ error: "Failed to save date management settings" });
    }
  });
}
