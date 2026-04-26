export interface DateThresholdGroup {
  reminderDays: number;
  escalationDays: number;
  autoCloseDays: number;
}

export interface DateManagementThresholds {
  assignmentThresholds: DateThresholdGroup;
  recipientInactionThresholds: DateThresholdGroup;
}

export const defaultDateManagementThresholds: DateManagementThresholds = {
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

export function validateDateManagementThresholds(settings: DateManagementThresholds): string[] {
  return [
    ...validateGroup(settings.assignmentThresholds, "assignmentThresholds"),
    ...validateGroup(settings.recipientInactionThresholds, "recipientInactionThresholds")
  ];
}
