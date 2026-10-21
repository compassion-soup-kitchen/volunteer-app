/**
 * Sorting for the staff tables - the volunteer directory and the applications
 * list - kept pure so the orders can be tested without rendering a table.
 *
 * The sort lives in the URL as `?sort=name` (ascending) or `?sort=-joined`
 * (descending), so a sorted list survives a trip into someone's record and
 * back, and can be shared.
 */

import type { ApplicationListItem, VolunteerListItem } from "@/lib/staff-actions";

export type SortDirection = "asc" | "desc";

export interface Sort<K extends string> {
  key: K;
  direction: SortDirection;
}

type Compare<T> = (a: T, b: T) => number;

/** How one column sorts, and which way it goes the first time it's picked. */
interface Column<T> {
  compare: Compare<T>;
  /** Dates and counts start with the most recent or the most; words with A. */
  firstDirection: SortDirection;
}

/** `"name"` → name ascending, `"-joined"` → joined descending, else null. */
export function parseSort<K extends string>(
  value: string | null | undefined,
  keys: readonly K[]
): Sort<K> | null {
  if (!value) return null;
  const direction = value.startsWith("-") ? "desc" : "asc";
  const key = value.replace(/^-/, "");
  return (keys as readonly string[]).includes(key) ? { key: key as K, direction } : null;
}

export function formatSort<K extends string>(sort: Sort<K>): string {
  return sort.direction === "desc" ? `-${sort.key}` : sort.key;
}

/**
 * The sort after a header is clicked: the same column flips, a new column
 * starts its own natural way round.
 */
export function nextSort<K extends string>(
  current: Sort<K> | null,
  key: K,
  firstDirection: SortDirection
): Sort<K> {
  if (current?.key === key) {
    return { key, direction: current.direction === "asc" ? "desc" : "asc" };
  }
  return { key, direction: firstDirection };
}

/**
 * One choice in the sort menu that stands in for the headers where a table
 * becomes a list (phones and tablets): a column, a direction, and how a
 * coordinator would say it.
 */
export interface SortOption<K extends string> {
  sort: Sort<K>;
  label: string;
}

/** `aria-sort` for a header: only the column doing the sorting says so. */
export function ariaSort<K extends string>(
  sort: Sort<K> | null,
  key: K
): "ascending" | "descending" | undefined {
  if (sort?.key !== key) return undefined;
  return sort.direction === "asc" ? "ascending" : "descending";
}

const collator = new Intl.Collator("en-NZ", { sensitivity: "base", numeric: true });

/**
 * Names in alphabetical order, ignoring case and macrons. Someone without a
 * name sorts where the table shows them - under "Unnamed".
 */
function compareNames(a: string | null, b: string | null): number {
  return collator.compare(a || "Unnamed", b || "Unnamed");
}

/** Ranks values by their place in a list; anything not in it goes after. */
function rankBy(order: readonly string[]) {
  return (value: string | null) => {
    const index = value === null ? -1 : order.indexOf(value);
    return index === -1 ? order.length : index;
  };
}

/**
 * Sorts by the chosen column, then by `tieBreak` (which ignores the
 * direction), then in the order the server returned - Array.sort is stable.
 */
function sortRows<T, K extends string>(
  rows: readonly T[],
  sort: Sort<K> | null,
  columns: Record<K, Column<T>>,
  tieBreak: Compare<T>
): T[] {
  if (!sort) return [...rows];
  const { compare } = columns[sort.key];
  const sign = sort.direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => sign * compare(a, b) || tieBreak(a, b));
}

// ─── Volunteer directory ────────────────────────────────

export const VOLUNTEER_SORT_KEYS = ["name", "status", "shifts", "joined"] as const;
export type VolunteerSortKey = (typeof VOLUNTEER_SORT_KEYS)[number];

/** Status in the order people move through it; no application yet comes last. */
const volunteerStatusRank = rankBy([
  "APPLICATION_SUBMITTED",
  "AWAITING_VETTING",
  "APPROVED_FOR_INDUCTION",
  "ACTIVE",
  "INACTIVE",
]);

const byVolunteerName: Compare<VolunteerListItem> = (a, b) =>
  compareNames(a.user.name, b.user.name);

export const VOLUNTEER_COLUMNS: Record<VolunteerSortKey, Column<VolunteerListItem>> = {
  name: { compare: byVolunteerName, firstDirection: "asc" },
  status: {
    compare: (a, b) =>
      volunteerStatusRank(a.hasProfile ? a.status : null) -
      volunteerStatusRank(b.hasProfile ? b.status : null),
    firstDirection: "asc",
  },
  shifts: {
    compare: (a, b) => a._count.shiftSignups - b._count.shiftSignups,
    firstDirection: "desc",
  },
  joined: {
    compare: (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    firstDirection: "desc",
  },
};

/** No sort leaves the directory in the server's order. Ties fall back to name. */
/** Every column both ways round, each column's natural direction first. */
export const VOLUNTEER_SORT_OPTIONS: SortOption<VolunteerSortKey>[] = [
  { sort: { key: "name", direction: "asc" }, label: "Name, A to Z" },
  { sort: { key: "name", direction: "desc" }, label: "Name, Z to A" },
  { sort: { key: "status", direction: "asc" }, label: "Status, just applied first" },
  { sort: { key: "status", direction: "desc" }, label: "Status, inactive first" },
  { sort: { key: "shifts", direction: "desc" }, label: "Most shifts" },
  { sort: { key: "shifts", direction: "asc" }, label: "Fewest shifts" },
  { sort: { key: "joined", direction: "desc" }, label: "Joined most recently" },
  { sort: { key: "joined", direction: "asc" }, label: "Joined longest ago" },
];

export function sortVolunteers(
  rows: readonly VolunteerListItem[],
  sort: Sort<VolunteerSortKey> | null
): VolunteerListItem[] {
  return sortRows(rows, sort, VOLUNTEER_COLUMNS, byVolunteerName);
}

// ─── Applications ───────────────────────────────────────

export const APPLICATION_SORT_KEYS = ["name", "status", "submitted"] as const;
export type ApplicationSortKey = (typeof APPLICATION_SORT_KEYS)[number];

/** What needs a coordinator first: waiting, then waiting on the applicant, then decided. */
const applicationStatusRank = rankBy(["PENDING", "INFO_REQUESTED", "APPROVED", "DECLINED"]);

export const APPLICATION_COLUMNS: Record<ApplicationSortKey, Column<ApplicationListItem>> = {
  name: {
    compare: (a, b) => compareNames(a.volunteer.user.name, b.volunteer.user.name),
    firstDirection: "asc",
  },
  status: {
    compare: (a, b) => applicationStatusRank(a.status) - applicationStatusRank(b.status),
    firstDirection: "asc",
  },
  submitted: {
    compare: (a, b) => a.submittedAt.getTime() - b.submittedAt.getTime(),
    firstDirection: "desc",
  },
};

/** The list opens with what needs reviewing on top, as it always has. */
export const DEFAULT_APPLICATION_SORT: Sort<ApplicationSortKey> = {
  key: "status",
  direction: "asc",
};

export const APPLICATION_SORT_OPTIONS: SortOption<ApplicationSortKey>[] = [
  { sort: { key: "status", direction: "asc" }, label: "Needs review first" },
  { sort: { key: "status", direction: "desc" }, label: "Decided first" },
  { sort: { key: "submitted", direction: "desc" }, label: "Newest first" },
  { sort: { key: "submitted", direction: "asc" }, label: "Oldest first" },
  { sort: { key: "name", direction: "asc" }, label: "Name, A to Z" },
  { sort: { key: "name", direction: "desc" }, label: "Name, Z to A" },
];

/**
 * Ties fall back to newest first: within a status, the application a
 * coordinator is looking for is usually the one that just came in.
 */
export function sortApplications(
  rows: readonly ApplicationListItem[],
  sort: Sort<ApplicationSortKey>
): ApplicationListItem[] {
  return sortRows(
    rows,
    sort,
    APPLICATION_COLUMNS,
    (a, b) => b.submittedAt.getTime() - a.submittedAt.getTime()
  );
}
