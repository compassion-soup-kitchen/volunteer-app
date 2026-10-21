/**
 * Pure rules behind the staff month calendar (`/staff/calendar`): what a day
 * cell says about itself, and where the arrow keys take you. Kept apart from
 * the component so they can be tested without rendering a month.
 */

/** The parts of a shift a day cell needs to describe itself. */
export interface CellShift {
  filled: number;
  capacity: number;
}

/** Whether a shift still needs people - the thing a coordinator scans for. */
export function isShort(shift: CellShift): boolean {
  return shift.filled < shift.capacity;
}

/**
 * How many of a day's shifts still need people. A past day is history - its
 * empty seats can't be filled any more - so it never counts as short.
 */
export function shortCount(shifts: CellShift[], isPast: boolean): number {
  return isPast ? 0 : shifts.filter(isShort).length;
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/**
 * What a screen reader hears for one day of the month, after the date itself.
 * It says everything the cell shows - including how many shifts are short,
 * which the cell otherwise marks with colour.
 */
export function describeDay(day: {
  shifts: CellShift[];
  isPast: boolean;
  closureReason: string | null;
  holidayName: string | null;
  awayCount: number;
}): string {
  if (day.closureReason) return `closed, ${day.closureReason}`;
  const short = shortCount(day.shifts, day.isPast);
  return [
    day.holidayName,
    day.shifts.length === 0 ? "nothing rostered" : plural(day.shifts.length, "shift", "shifts"),
    short > 0 ? `${short} ${short === 1 ? "needs" : "need"} people` : null,
    day.awayCount > 0 ? `${day.awayCount} on leave` : null,
  ]
    .filter(Boolean)
    .join(", ");
}

/**
 * A service area's name cut to the word that fits beside a time in a day
 * cell, even at its widest: "Kitchen & Meals" → "Kitchen", "Community
 * Garden" → "Community". The day panel always has the full name.
 */
export function shortAreaName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

/** Keys that move focus around the month grid. */
export type GridKey = "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown" | "Home" | "End";

export function isGridKey(key: string): key is GridKey {
  return ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(key);
}

/**
 * Where focus lands after a key press in a grid of `count` cells laid out in
 * weeks of seven: arrows move a day or a week, Home and End go to the start
 * or end of the week. Focus stops at the edges of the grid rather than
 * wrapping, so holding an arrow can't loop you back to the top.
 */
export function moveInGrid(index: number, key: GridKey, count: number): number {
  const weekStart = index - (index % 7);
  const next = {
    ArrowLeft: index - 1,
    ArrowRight: index + 1,
    ArrowUp: index - 7,
    ArrowDown: index + 7,
    Home: weekStart,
    End: weekStart + 6,
  }[key];
  return next >= 0 && next < count ? next : index;
}
