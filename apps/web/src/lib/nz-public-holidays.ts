/**
 * New Zealand's public holidays, as the kitchen in Wellington observes them -
 * what the closed-days calendar offers to block out.
 *
 * Pure, and in `DateOnly` strings throughout (see date-only.ts). Follows the
 * Holidays Act 2003: Waitangi and Anzac Day move to the Monday when they fall
 * on a weekend, the Christmas and New Year pairs are "Mondayised" together, and
 * Matariki comes from the fixed schedule in the Te Kāhui o Matariki Public
 * Holiday Act 2022 rather than being calculated.
 */

import {
  addDaysToDateOnly,
  parseDateOnly,
  type DateOnly,
} from "@/lib/date-only";

export type PublicHoliday = {
  date: DateOnly;
  name: string;
};

/**
 * Te Kāhui o Matariki Public Holiday Act 2022, Schedule 1. Always a Friday.
 * Years past 2052 have no date set in law yet.
 */
const MATARIKI: Record<number, DateOnly> = {
  2022: "2022-06-24",
  2023: "2023-07-14",
  2024: "2024-06-28",
  2025: "2025-06-20",
  2026: "2026-07-10",
  2027: "2027-06-25",
  2028: "2028-07-14",
  2029: "2029-07-06",
  2030: "2030-06-21",
  2031: "2031-07-11",
  2032: "2032-07-02",
  2033: "2033-06-24",
  2034: "2034-07-07",
  2035: "2035-06-29",
  2036: "2036-07-18",
  2037: "2037-07-10",
  2038: "2038-06-25",
  2039: "2039-07-15",
  2040: "2040-07-06",
  2041: "2041-07-19",
  2042: "2042-07-11",
  2043: "2043-07-03",
  2044: "2044-06-24",
  2045: "2045-07-07",
  2046: "2046-06-29",
  2047: "2047-07-19",
  2048: "2048-07-03",
  2049: "2049-06-25",
  2050: "2050-07-15",
  2051: "2051-06-30",
  2052: "2052-06-21",
};

const SATURDAY = 6;
const SUNDAY = 0;
const MONDAY = 1;

function day(year: number, month: number, date: number): DateOnly {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(date).padStart(2, "0")}`;
}

function weekdayOf(value: DateOnly): number {
  return parseDateOnly(value).getUTCDay();
}

/** The `nth` Monday of a month, 1-indexed. */
function nthMonday(year: number, month: number, nth: number): DateOnly {
  const first = day(year, month, 1);
  const toMonday = (MONDAY - weekdayOf(first) + 7) % 7;
  return addDaysToDateOnly(first, toMonday + (nth - 1) * 7);
}

/** A weekend holiday is observed on the Monday after. */
function mondayised(value: DateOnly): { date: DateOnly; observed: boolean } {
  const weekday = weekdayOf(value);
  if (weekday === SATURDAY) return { date: addDaysToDateOnly(value, 2), observed: true };
  if (weekday === SUNDAY) return { date: addDaysToDateOnly(value, 1), observed: true };
  return { date: value, observed: false };
}

/**
 * Two holidays on consecutive days - Christmas and Boxing Day, New Year's Day
 * and the day after. Whichever lands on the weekend moves to the next weekday
 * the other isn't already using.
 */
function mondayisedPair(
  first: DateOnly,
  firstName: string,
  secondName: string
): PublicHoliday[] {
  const second = addDaysToDateOnly(first, 1);
  const weekday = weekdayOf(first);
  const label = (name: string, observed: boolean) =>
    observed ? `${name} (observed)` : name;

  if (weekday === SATURDAY) {
    // Sat + Sun: both move, to Monday and Tuesday.
    return [
      { date: addDaysToDateOnly(first, 2), name: label(firstName, true) },
      { date: addDaysToDateOnly(first, 3), name: label(secondName, true) },
    ];
  }
  if (weekday === SUNDAY) {
    // Sun + Mon: the second keeps its Monday, so the first takes Tuesday.
    return [
      { date: second, name: secondName },
      { date: addDaysToDateOnly(first, 2), name: label(firstName, true) },
    ];
  }
  if (weekday === 5) {
    // Fri + Sat: the second moves to Monday.
    return [
      { date: first, name: firstName },
      { date: addDaysToDateOnly(first, 3), name: label(secondName, true) },
    ];
  }
  return [
    { date: first, name: firstName },
    { date: second, name: secondName },
  ];
}

/** Easter Sunday, by the anonymous Gregorian computus. */
export function easterSunday(year: number): DateOnly {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const date = ((h + l - 7 * m + 114) % 31) + 1;
  return day(year, month, date);
}

/**
 * Wellington Anniversary Day: the Monday nearest 22 January. A Friday 22nd
 * is three days from the next Monday and four from the last, so it goes
 * forward; a Thursday goes back.
 */
function wellingtonAnniversary(year: number): DateOnly {
  const anchor = day(year, 1, 22);
  const weekday = weekdayOf(anchor);
  // Tuesday to Thursday step back to the Monday before; Friday to Sunday go
  // on to the Monday after.
  const isMidweek = weekday >= 2 && weekday <= 4;
  const offset = isMidweek ? MONDAY - weekday : (MONDAY - weekday + 7) % 7;
  return addDaysToDateOnly(anchor, offset);
}

/** Every public holiday the kitchen observes in a year, in date order. */
export function nzPublicHolidays(year: number): PublicHoliday[] {
  const easter = easterSunday(year);
  const waitangi = mondayised(day(year, 2, 6));
  const anzac = mondayised(day(year, 4, 25));

  const holidays: PublicHoliday[] = [
    ...mondayisedPair(day(year, 1, 1), "New Year's Day", "Day after New Year's Day"),
    { date: wellingtonAnniversary(year), name: "Wellington Anniversary Day" },
    {
      date: waitangi.date,
      name: waitangi.observed ? "Waitangi Day (observed)" : "Waitangi Day",
    },
    { date: addDaysToDateOnly(easter, -2), name: "Good Friday" },
    { date: addDaysToDateOnly(easter, 1), name: "Easter Monday" },
    { date: anzac.date, name: anzac.observed ? "Anzac Day (observed)" : "Anzac Day" },
    { date: nthMonday(year, 6, 1), name: "King's Birthday" },
    ...(MATARIKI[year] ? [{ date: MATARIKI[year], name: "Matariki" }] : []),
    { date: nthMonday(year, 10, 4), name: "Labour Day" },
    ...mondayisedPair(day(year, 12, 25), "Christmas Day", "Boxing Day"),
  ];

  return holidays.sort((a, b) => a.date.localeCompare(b.date));
}

/** Public holidays falling between two calendar days, inclusive. */
export function nzPublicHolidaysBetween(
  from: DateOnly,
  to: DateOnly
): PublicHoliday[] {
  const firstYear = Number(from.slice(0, 4));
  const lastYear = Number(to.slice(0, 4));
  const holidays: PublicHoliday[] = [];
  for (let year = firstYear; year <= lastYear; year++) {
    for (const holiday of nzPublicHolidays(year)) {
      if (holiday.date >= from && holiday.date <= to) holidays.push(holiday);
    }
  }
  return holidays;
}
