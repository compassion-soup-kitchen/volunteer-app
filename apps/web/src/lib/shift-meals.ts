import { z } from "zod";

/** Sanity ceiling for a single shift's kai count - well above any real service. */
export const MEALS_SERVED_MAX = 5000;

export const mealsServedSchema = z
  .number()
  .int()
  .min(0)
  .max(MEALS_SERVED_MAX);

/**
 * Kai can only be recorded once the shift day has arrived - never for a
 * future shift. `Shift.date` is date-only (@db.Date), encoded as midnight
 * UTC, so "today" is anchored to the UTC day boundary rather than the
 * server's timezone (same anchoring as shift-notifications.ts).
 */
export function canRecordMeals(shiftDate: Date, now: Date): boolean {
  const todayUtc = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  );
  return shiftDate.getTime() <= todayUtc;
}
