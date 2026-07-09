const shiftDayFormat = new Intl.DateTimeFormat("en-NZ", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

/**
 * "Friday, 10 July" — formatted on the UTC day the date-only value
 * encodes, so the text can't drift from the UTC boundary check below if
 * the server's timezone ever changes.
 */
export function formatShiftDay(date: Date): string {
  return shiftDayFormat.format(date);
}

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
 * past days — but a shift later today does. `Shift.date` is date-only,
 * encoded as midnight UTC, so "today" is anchored to the UTC day boundary
 * rather than the server's timezone (which must not change the outcome).
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

  const todayUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  return detailsChanged && updated.date >= todayUtc;
}
