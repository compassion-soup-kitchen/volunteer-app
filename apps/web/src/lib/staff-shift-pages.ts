/**
 * Paging for the staff shift list. Repeating shifts are generated twelve
 * weeks ahead, so "Upcoming" alone runs to hundreds of rows; the list shows a
 * page at a time, nearest first, with "Show more" for the rest.
 *
 * Each read asks for one row beyond what it will show - that extra row is how
 * the list knows there is more without a separate count query.
 */

/** Roughly two to three weeks of the kitchen's roster. */
export const STAFF_SHIFTS_PAGE_SIZE = 40;

/** How many rows to request to show `pages` pages and learn if more exist. */
export function staffShiftsLimit(pages: number): number {
  return Math.max(1, Math.floor(pages)) * STAFF_SHIFTS_PAGE_SIZE + 1;
}

/** Trims a read made with `staffShiftsLimit(pages)` to what the list shows. */
export function pageOfShifts<T>(
  rows: T[],
  pages: number
): { shifts: T[]; hasMore: boolean } {
  const shown = staffShiftsLimit(pages) - 1;
  return { shifts: rows.slice(0, shown), hasMore: rows.length > shown };
}
