import { z } from "zod";

import { startOfTodayInAppZone } from "@/lib/date-only";

/** Sanity ceiling for a single shift's kai count - well above any real service. */
export const MEALS_SERVED_MAX = 5000;

export const mealsServedSchema = z
  .number()
  .int()
  .min(0)
  .max(MEALS_SERVED_MAX);

/**
 * Kai can only be recorded once the shift day has arrived - never for a
 * future shift. "Today" is the day on the kitchen's own wall calendar, so a
 * morning shift can be written up over lunch rather than waiting for UTC to
 * catch up (see date-only.ts).
 */
export function canRecordMeals(shiftDate: Date, now: Date): boolean {
  return shiftDate <= startOfTodayInAppZone(now);
}
