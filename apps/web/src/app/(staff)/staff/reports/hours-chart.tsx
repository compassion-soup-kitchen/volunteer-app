import { ShareBar } from "@/components/brand/share-bar";
import { StatFigure } from "@/components/brand/stat-figure";
import type { HoursByServiceArea } from "@/lib/report-actions";
import { cn } from "@/lib/utils";

const hoursFormat = new Intl.NumberFormat("en-NZ", { maximumFractionDigits: 1 });

/**
 * Hours by service area as a ranked bar ledger: each row carries its own name
 * and figure, so no label can be dropped or drift away from its bar the way
 * category ticks on a column chart do once the names get long. Bars share one
 * scale - the busiest area fills the well - and one colour, since the colour
 * would otherwise encode nothing.
 */
export function HoursChart({ data }: { data: HoursByServiceArea[] }) {
  // Busiest first; the sort is stable, so ties keep the alphabetical order the
  // report action returns.
  const rows = [...data].sort((a, b) => b.totalHours - a.totalHours);
  const maxHours = rows[0]?.totalHours ?? 0;

  return (
    <ul className="space-y-3.5">
      {rows.map((area) => {
        const idle = area.totalHours === 0;
        return (
          <li key={area.serviceAreaId}>
            <div className="flex items-baseline justify-between gap-4">
              <span
                className={cn(
                  "min-w-0 text-sm font-medium",
                  idle && "text-muted-foreground"
                )}
              >
                {area.serviceAreaName}
              </span>
              <StatFigure
                size="md"
                value={hoursFormat.format(area.totalHours)}
                unit="h"
                className={cn("shrink-0", idle && "text-muted-foreground")}
              />
            </div>
            <ShareBar
              size="md"
              percent={maxHours > 0 ? (area.totalHours / maxHours) * 100 : 0}
              className="mt-1.5"
            />
          </li>
        );
      })}
    </ul>
  );
}
