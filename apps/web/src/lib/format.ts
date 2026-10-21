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

/**
 * What to call someone in a list: their name, or their email address when they
 * never gave one. Offline volunteers may have no address at all, but staff
 * can't add one without a name, so the last fallback only covers a malformed
 * record.
 */
export function personName(person: {
  name: string | null;
  email: string | null;
}): string {
  return person.name?.trim() || person.email || "Unnamed volunteer";
}

/**
 * One or two letters for an avatar: first and last name, so "Mere Te Rangi"
 * reads "MR". A missing name shows "?" rather than an empty circle.
 */
export function initials(name: string | null | undefined): string {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase() || "?";
}

/**
 * The one line under someone's name that says how to reach them. An offline
 * volunteer often has no email, and a phone number is what staff ring.
 */
export function contactLine(person: {
  email: string | null;
  phone?: string | null;
}): string {
  return person.email || person.phone?.trim() || "No email or phone";
}
