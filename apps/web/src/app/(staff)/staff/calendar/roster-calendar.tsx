"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  RiAddLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiDoorClosedLine,
  RiDoorOpenLine,
  RiRepeatLine,
  RiSuitcaseLine,
} from "@remixicon/react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DateBlock } from "@/components/brand/date-block";
import { BleedList } from "@/components/brand/detail-list";
import {
  closeDays,
  reopenClosedDay,
  type CalendarAway,
  type CalendarClosedDay,
  type CalendarShift,
  type RosterMonth,
} from "@/lib/closed-day-actions";
import { monthGrid } from "@/lib/closed-days";
import { coversDay, formatLeaveRange } from "@/lib/leave";
import {
  addMonthsToDateOnly,
  formatDateOnly,
  isDateOnly,
  parseDateOnly,
  type DateOnly,
} from "@/lib/date-only";
import { formatTime, formatTimeRange } from "@/lib/format";
import type { PublicHoliday } from "@/lib/nz-public-holidays";
import { cn } from "@/lib/utils";
import { CloseDayDialog, describeClosureOutcome } from "./close-day-dialog";
import { Eyebrow } from "@/components/brand/eyebrow";

const WEEKDAY_HEADINGS = [
  { short: "Mon", label: "Monday" },
  { short: "Tue", label: "Tuesday" },
  { short: "Wed", label: "Wednesday" },
  { short: "Thu", label: "Thursday" },
  { short: "Fri", label: "Friday" },
  { short: "Sat", label: "Saturday" },
  { short: "Sun", label: "Sunday" },
];

/** How many shifts a desktop cell lists before trailing off into a count. */
const CELL_SHIFT_LIMIT = 3;

/** Public holidays listed before the rest fold away behind "Show all". */
const HOLIDAYS_SHOWN = 5;

const LONG_DAY: Intl.DateTimeFormatOptions = {
  weekday: "long",
  day: "numeric",
  month: "long",
};

function longDay(date: DateOnly): string {
  return formatDateOnly(parseDateOnly(date), LONG_DAY);
}

function monthParam(date: DateOnly): string {
  return date.slice(0, 7);
}

interface RosterCalendarProps {
  data: RosterMonth;
  /** `?day=` from the URL, so a link can open on a particular day. */
  initialDate?: string;
}

export function RosterCalendar({ data, initialDate }: RosterCalendarProps) {
  const router = useRouter();
  const weeks = useMemo(() => monthGrid(data.month), [data.month]);

  const shiftsByDate = useMemo(() => {
    const map = new Map<DateOnly, CalendarShift[]>();
    for (const shift of data.shifts) {
      map.set(shift.date, [...(map.get(shift.date) ?? []), shift]);
    }
    return map;
  }, [data.shifts]);
  const closedByDate = useMemo(
    () => new Map(data.closedDays.map((day) => [day.date, day])),
    [data.closedDays]
  );
  const holidayByDate = useMemo(
    () => new Map(data.holidays.map((holiday) => [holiday.date, holiday])),
    [data.holidays]
  );
  const awayByDate = useMemo(() => {
    const map = new Map<DateOnly, CalendarAway[]>();
    for (const day of weeks.flat()) {
      const away = data.away.filter((leave) => coversDay(leave, day.date));
      if (away.length > 0) map.set(day.date, away);
    }
    return map;
  }, [weeks, data.away]);

  const inGrid = (date: string | undefined): date is DateOnly =>
    !!date && isDateOnly(date) && weeks.some((week) => week.some((d) => d.date === date));
  const [selected, setSelected] = useState<DateOnly>(() =>
    inGrid(initialDate)
      ? initialDate
      : monthParam(data.today) === monthParam(data.month)
        ? data.today
        : data.month
  );

  const [closing, setClosing] = useState<{ date: DateOnly; reason: string } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  /**
   * Below the two-column layout the day panel sits under the whole month, so
   * picking a day would change nothing in view - bring the panel up to meet
   * the tap.
   */
  function selectDay(date: DateOnly) {
    setSelected(date);
    if (window.matchMedia("(min-width: 1024px)").matches) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    requestAnimationFrame(() =>
      panelRef.current?.scrollIntoView({
        behavior: reduce ? "auto" : "smooth",
        block: "start",
      })
    );
  }

  const refresh = () => router.refresh();

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_340px]">
      <Card className="gap-0 self-start py-0">
        <MonthHeader month={data.month} today={data.today} />

        <div role="grid" aria-label={formatDateOnly(parseDateOnly(data.month), { month: "long", year: "numeric" })}>
          <div role="row" className="grid grid-cols-7 border-y border-border bg-muted/50">
            {WEEKDAY_HEADINGS.map((day) => (
              <div
                key={day.short}
                role="columnheader"
                aria-label={day.label}
                className="px-2 py-1.5 text-center text-xs font-semibold text-muted-foreground sm:text-left"
              >
                {day.short}
              </div>
            ))}
          </div>

          {weeks.map((week) => (
            <div role="row" key={week[0].date} className="grid grid-cols-7">
              {week.map((day) => (
                <DayCell
                  key={day.date}
                  date={day.date}
                  inMonth={day.inMonth}
                  isToday={day.date === data.today}
                  isPast={day.date < data.today}
                  selected={day.date === selected}
                  shifts={shiftsByDate.get(day.date) ?? []}
                  closure={closedByDate.get(day.date) ?? null}
                  holiday={holidayByDate.get(day.date) ?? null}
                  awayCount={awayByDate.get(day.date)?.length ?? 0}
                  onSelect={() => selectDay(day.date)}
                />
              ))}
            </div>
          ))}
        </div>

        <Legend />
      </Card>

      <div ref={panelRef} className="scroll-mt-20 space-y-6">
        <DayPanel
          date={selected}
          today={data.today}
          shifts={shiftsByDate.get(selected) ?? []}
          closure={closedByDate.get(selected) ?? null}
          holiday={holidayByDate.get(selected) ?? null}
          away={awayByDate.get(selected) ?? []}
          onClose={(reason) => setClosing({ date: selected, reason })}
          onReopened={refresh}
        />

        <HolidaySuggestions
          suggestions={data.suggestions}
          onCloseOne={(holiday) => setClosing({ date: holiday.date, reason: holiday.name })}
          onClosedAll={refresh}
        />
      </div>

      <CloseDayDialog
        date={closing?.date ?? null}
        defaultReason={closing?.reason ?? ""}
        onClose={() => setClosing(null)}
        onClosed={() => {
          setClosing(null);
          refresh();
        }}
      />
    </div>
  );
}

// ─── Month header ───────────────────────────────────────

function MonthHeader({ month, today }: { month: DateOnly; today: DateOnly }) {
  const isThisMonth = monthParam(month) === monthParam(today);
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
      <h2 className="font-serif text-xl font-medium tracking-tight sm:text-2xl">
        {formatDateOnly(parseDateOnly(month), { month: "long", year: "numeric" })}
      </h2>
      <div className="flex items-center gap-1">
        {!isThisMonth && (
          <Button asChild variant="ghost" size="sm">
            <Link href="/staff/calendar">This month</Link>
          </Button>
        )}
        <Button asChild variant="outline" size="icon-sm">
          <Link
            href={`/staff/calendar?month=${monthParam(addMonthsToDateOnly(month, -1))}`}
            aria-label="Previous month"
          >
            <RiArrowLeftSLine />
          </Link>
        </Button>
        <Button asChild variant="outline" size="icon-sm">
          <Link
            href={`/staff/calendar?month=${monthParam(addMonthsToDateOnly(month, 1))}`}
            aria-label="Next month"
          >
            <RiArrowRightSLine />
          </Link>
        </Button>
      </div>
    </div>
  );
}

// ─── One day of the grid ────────────────────────────────

interface DayCellProps {
  date: DateOnly;
  inMonth: boolean;
  isToday: boolean;
  isPast: boolean;
  selected: boolean;
  shifts: CalendarShift[];
  closure: CalendarClosedDay | null;
  holiday: PublicHoliday | null;
  /** Volunteers on leave that day. */
  awayCount: number;
  onSelect: () => void;
}

/** Whether a shift still needs people - the thing a coordinator scans for. */
function isShort(shift: CalendarShift): boolean {
  return shift.filled < shift.capacity;
}

function DayCell({
  date,
  inMonth,
  isToday,
  isPast,
  selected,
  shifts,
  closure,
  holiday,
  awayCount,
  onSelect,
}: DayCellProps) {
  const summary = closure
    ? `closed, ${closure.reason}`
    : [
        holiday?.name,
        shifts.length === 0
          ? "nothing rostered"
          : `${shifts.length} ${shifts.length === 1 ? "shift" : "shifts"}`,
        awayCount > 0 ? `${awayCount} on leave` : null,
      ]
        .filter(Boolean)
        .join(", ");

  return (
    <button
      type="button"
      role="gridcell"
      aria-selected={selected}
      aria-label={`${longDay(date)}: ${summary}`}
      onClick={onSelect}
      className={cn(
        "relative flex min-h-16 flex-col gap-1 border-r border-b border-border p-1.5 text-left transition-colors outline-none last:border-r-0 sm:min-h-28 sm:p-2",
        "focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-inset",
        closure ? "closed-hatch" : "hover:bg-secondary/40",
        !inMonth && "text-muted-foreground/60",
        !inMonth && !closure && "bg-muted/30",
        selected && "z-10 ring-2 ring-primary ring-inset"
      )}
    >
      <span
        className={cn(
          "grid size-6 place-items-center rounded-full text-xs font-semibold tnum",
          isToday && "bg-primary-fill text-primary-foreground"
        )}
      >
        {Number(date.slice(8))}
      </span>

      {closure ? (
        <span className="line-clamp-3 font-serif text-[0.68rem]/tight break-words text-muted-foreground italic max-sm:sr-only">
          {closure.reason}
        </span>
      ) : (
        <>
          {holiday && (
            <span className="truncate text-[0.68rem] font-semibold text-warning-tint-foreground max-sm:sr-only">
              {holiday.name}
            </span>
          )}

          {/* Phone width: a dot per shift, short ones in amber. */}
          <span aria-hidden className="flex flex-wrap gap-1 sm:hidden">
            {shifts.slice(0, 4).map((shift) => (
              <span
                key={shift.id}
                className={cn(
                  "size-1.5 rounded-full",
                  isShort(shift) && !isPast ? "bg-warning" : "bg-muted-foreground/50"
                )}
              />
            ))}
          </span>

          <span aria-hidden className="hidden flex-col gap-0.5 sm:flex">
            {shifts.slice(0, CELL_SHIFT_LIMIT).map((shift) => (
              <span
                key={shift.id}
                className={cn(
                  "flex items-center gap-1 truncate text-[0.7rem]/tight",
                  isPast && "opacity-60"
                )}
              >
                <span
                  className={cn(
                    "size-1.5 shrink-0 rounded-full",
                    isShort(shift) && !isPast ? "bg-warning" : "bg-muted-foreground/50"
                  )}
                />
                <span className="font-semibold tnum">{formatTime(shift.startTime)}</span>
                <span className="truncate text-muted-foreground">{shift.serviceAreaName}</span>
              </span>
            ))}
            {shifts.length > CELL_SHIFT_LIMIT && (
              <span className="text-[0.7rem] font-semibold text-muted-foreground">
                +{shifts.length - CELL_SHIFT_LIMIT} more
              </span>
            )}
          </span>

          {awayCount > 0 && (
            <span
              aria-hidden
              className="mt-auto hidden items-center gap-1 text-[0.68rem] text-muted-foreground sm:flex"
            >
              <RiSuitcaseLine className="size-3 shrink-0" />
              <span className="tnum">{awayCount}</span> away
            </span>
          )}
        </>
      )}
    </button>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border px-4 py-3 text-xs text-muted-foreground sm:px-5">
      <span className="flex items-center gap-1.5">
        <span aria-hidden className="size-2 rounded-full bg-warning" />
        Still needs people
      </span>
      <span className="flex items-center gap-1.5">
        <span aria-hidden className="size-2 rounded-full bg-muted-foreground/50" />
        Full, or already past
      </span>
      <span className="flex items-center gap-1.5">
        <span aria-hidden className="closed-hatch size-3.5 rounded-sm ring-1 ring-border" />
        Kitchen closed
      </span>
    </div>
  );
}

// ─── The selected day ───────────────────────────────────

interface DayPanelProps {
  date: DateOnly;
  today: DateOnly;
  shifts: CalendarShift[];
  closure: CalendarClosedDay | null;
  holiday: PublicHoliday | null;
  away: CalendarAway[];
  onClose: (defaultReason: string) => void;
  onReopened: () => void;
}

function DayPanel({
  date,
  today,
  shifts,
  closure,
  holiday,
  away,
  onClose,
  onReopened,
}: DayPanelProps) {
  const [confirmReopen, setConfirmReopen] = useState(false);
  const isPast = date < today;

  async function handleReopen(): Promise<boolean> {
    if (!closure) return false;
    const result = await reopenClosedDay(closure.id);
    if (result.error) {
      toast.error(result.error);
      return false;
    }
    const restored = result.restoredShifts ?? 0;
    toast.success(
      restored > 0
        ? `Open again. ${restored} repeating ${restored === 1 ? "shift is" : "shifts are"} back on the roster.`
        : "Open again."
    );
    onReopened();
    return true;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif text-lg font-medium tracking-tight">
          {longDay(date)}
        </CardTitle>
        <CardDescription>
          {closure
            ? "The kitchen is closed"
            : holiday
              ? holiday.name
              : shifts.length === 0
                ? "Nothing rostered"
                : `${shifts.length} ${shifts.length === 1 ? "shift" : "shifts"} rostered`}
        </CardDescription>
        {date === today && (
          <CardAction>
            <Badge>Today</Badge>
          </CardAction>
        )}
      </CardHeader>

      {closure ? (
        <CardContent className="space-y-4">
          <div className="closed-hatch rounded-lg px-4 py-3 ring-1 ring-border">
            <p className="font-serif text-base italic">{closure.reason}</p>
            {closure.createdByName && (
              <p className="mt-1 text-xs text-muted-foreground">
                Closed by {closure.createdByName}
              </p>
            )}
          </div>
          {!isPast && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setConfirmReopen(true)}
            >
              <RiDoorOpenLine />
              Open this day again
            </Button>
          )}
        </CardContent>
      ) : (
        <>
          {shifts.length > 0 && (
            <BleedList>
              {shifts.map((shift) => (
                <li key={shift.id}>
                  <Link
                    href={`/staff/shifts/${shift.id}`}
                    className="flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-secondary/40 focus-visible:bg-secondary/40 focus-visible:outline-none"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 truncate text-sm font-semibold">
                        {shift.serviceAreaName}
                        {shift.isRepeating && (
                          <RiRepeatLine
                            className="size-3.5 shrink-0 text-muted-foreground"
                            aria-label="Repeating shift"
                          />
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground tnum">
                        {formatTimeRange(shift.startTime, shift.endTime)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 text-xs font-semibold tnum",
                        isShort(shift) && !isPast
                          ? "text-warning-tint-foreground"
                          : "text-muted-foreground"
                      )}
                    >
                      {shift.filled}/{shift.capacity}
                    </span>
                  </Link>
                </li>
              ))}
            </BleedList>
          )}

          {away.length > 0 && (
            <div className="border-t border-border px-5 py-3">
              <Eyebrow size="sm" tone="muted" className="mb-1.5 flex items-center gap-1.5">
                <RiSuitcaseLine aria-hidden className="size-3" />
                On leave · {away.length}
              </Eyebrow>
              <ul className="space-y-1">
                {away.map((leave) => (
                  <li key={leave.id} className="flex items-baseline justify-between gap-3 text-sm">
                    <Link
                      href={`/staff/volunteers/${leave.userId}`}
                      className="min-w-0 truncate font-medium hover:text-primary hover:underline"
                    >
                      {leave.name}
                    </Link>
                    <span className="shrink-0 text-xs text-muted-foreground tnum">
                      {formatLeaveRange(leave, today)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!isPast && (
            <CardContent className="flex flex-col gap-2">
              <Button asChild variant="outline" className="w-full">
                <Link href={`/staff/shifts/new?date=${date}`}>
                  <RiAddLine />
                  Add a shift this day
                </Link>
              </Button>
              <Button
                variant="ghost"
                className="w-full text-destructive hover:text-destructive"
                onClick={() => onClose(holiday?.name ?? "")}
              >
                <RiDoorClosedLine />
                Close the kitchen this day
              </Button>
            </CardContent>
          )}
        </>
      )}

      <AlertDialog open={confirmReopen} onOpenChange={setConfirmReopen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Open {longDay(date)} again?</AlertDialogTitle>
            <AlertDialogDescription>
              Repeating shifts that fall on this day go back on the roster, with
              their regulars. One-off shifts cancelled when it closed don&apos;t
              come back - add them again if you need them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it closed</AlertDialogCancel>
            <AlertDialogAction onConfirm={handleReopen}>Open it again</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

// ─── Public holidays to close ───────────────────────────

interface HolidaySuggestionsProps {
  suggestions: PublicHoliday[];
  onCloseOne: (holiday: PublicHoliday) => void;
  onClosedAll: () => void;
}

function HolidaySuggestions({ suggestions, onCloseOne, onClosedAll }: HolidaySuggestionsProps) {
  const [confirmAll, setConfirmAll] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const hidden = suggestions.length - HOLIDAYS_SHOWN;
  const shown = showAll ? suggestions : suggestions.slice(0, HOLIDAYS_SHOWN);

  async function handleCloseAll(): Promise<boolean> {
    const result = await closeDays(
      suggestions.map((holiday) => ({ date: holiday.date, reason: holiday.name }))
    );
    if (result.error) {
      toast.error(result.error);
      return false;
    }
    toast.success(
      `${result.closed} public ${result.closed === 1 ? "holiday" : "holidays"} closed. ${describeClosureOutcome(result)}`
    );
    onClosedAll();
    return true;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif text-lg font-medium tracking-tight">
          Public holidays ahead
        </CardTitle>
        <CardDescription>
          {suggestions.length === 0
            ? "Every public holiday in the next twelve months is already closed."
            : "Not closed yet. Close the ones the kitchen won't open on."}
        </CardDescription>
      </CardHeader>

      {suggestions.length > 0 && (
        <>
          <BleedList className="border-b">
            {shown.map((holiday) => (
              <li key={holiday.date} className="flex items-center gap-3 px-5 py-2.5">
                <DateBlock date={parseDateOnly(holiday.date)} className="scale-90" />
                <span aria-hidden className="self-stretch border-l border-border" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm/snug font-semibold text-pretty">{holiday.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateOnly(parseDateOnly(holiday.date), { weekday: "long" })}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onCloseOne(holiday)}
                  aria-label={`Close the kitchen on ${holiday.name}`}
                >
                  Close
                </Button>
              </li>
            ))}
            {hidden > 0 && (
              <li>
                <button
                  type="button"
                  onClick={() => setShowAll((value) => !value)}
                  aria-expanded={showAll}
                  className="w-full px-5 py-2.5 text-left text-sm font-semibold text-primary transition-colors outline-none hover:bg-secondary/40 focus-visible:bg-secondary/40"
                >
                  {showAll ? "Show fewer" : `Show ${hidden} more`}
                </button>
              </li>
            )}
          </BleedList>
          <CardContent>
            <Button className="w-full" onClick={() => setConfirmAll(true)}>
              <RiDoorClosedLine />
              Close all {suggestions.length}
            </Button>
          </CardContent>
        </>
      )}

      <AlertDialog open={confirmAll} onOpenChange={setConfirmAll}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Close the kitchen on all {suggestions.length} public holidays?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Any shifts already on those days are cancelled and the volunteers
              on them are told. You can open any of them again later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ul className="max-h-56 space-y-1 overflow-y-auto text-sm">
            {suggestions.map((holiday) => (
              <li key={holiday.date} className="flex justify-between gap-3">
                <span>{holiday.name}</span>
                <span className="text-muted-foreground tnum">
                  {formatDateOnly(parseDateOnly(holiday.date), {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </li>
            ))}
          </ul>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onConfirm={handleCloseAll}>
              Close all {suggestions.length}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
