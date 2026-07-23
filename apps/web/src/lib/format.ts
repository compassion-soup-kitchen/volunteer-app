/**
 * Shared display formatters. Shift and training times are stored as "HH:mm"
 * strings, so the whole app reads them back the same friendly way.
 */

/** "09:00" -> "9am", "13:30" -> "1:30pm". */
export function formatTime(time: string): string {
  const [hStr, mStr] = time.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return time;
  const period = h >= 12 ? "pm" : "am";
  const displayH = h % 12 === 0 ? 12 : h % 12;
  const displayM = m === 0 ? "" : `:${String(m).padStart(2, "0")}`;
  return `${displayH}${displayM}${period}`;
}

/** "09:00", "13:00" -> "9am – 1pm". */
export function formatTimeRange(start: string, end: string): string {
  return `${formatTime(start)} – ${formatTime(end)}`;
}
