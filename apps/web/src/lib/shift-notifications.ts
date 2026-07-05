import { startOfDay } from "date-fns";

/** The fields of a shift that decide whether volunteers get a push. */
export type ShiftNotificationDetails = {
  date: Date;
  startTime: string;
  endTime: string;
  serviceAreaId: string;
};

/**
 * Whether an edit moved the when/where of a shift volunteers still care
 * about. Capacity and notes tweaks don't count, and neither do shifts on
 * past days — but a shift later today does (`Shift.date` is date-only, so
 * it must be compared against the start of today, not the current time).
 */
export function shouldNotifyShiftChange(
  existing: ShiftNotificationDetails,
  updated: ShiftNotificationDetails,
  now: Date
): boolean {
  const detailsChanged =
    updated.date.getTime() !== existing.date.getTime() ||
    updated.startTime !== existing.startTime ||
    updated.endTime !== existing.endTime ||
    updated.serviceAreaId !== existing.serviceAreaId;

  return detailsChanged && updated.date >= startOfDay(now);
}
