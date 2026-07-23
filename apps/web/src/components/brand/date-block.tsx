import { cn } from "@/lib/utils";

interface DateBlockProps {
  date: Date;
  className?: string;
}

/**
 * DateBlock — the shared date treatment wherever shifts appear: a red weekday
 * overline over a big serif day numeral. Usually followed by a vertical
 * hairline. Purely presentational (pair with visible text elsewhere).
 */
export function DateBlock({ date, className }: DateBlockProps) {
  return (
    <div className={cn("flex min-w-11 flex-col items-center", className)}>
      <span className="text-[11px] font-semibold tracking-[0.08em] text-primary uppercase">
        {date.toLocaleDateString("en-NZ", { weekday: "short" })}
      </span>
      <span className="font-serif text-3xl/none font-medium tracking-tight tnum">
        {date.getDate()}
      </span>
      <span className="mt-0.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
        {date.toLocaleDateString("en-NZ", { month: "short" })}
      </span>
    </div>
  );
}
