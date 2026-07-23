import { cn } from "@/lib/utils";

interface CapacityMeterProps {
  filled: number;
  capacity: number;
  className?: string;
}

/**
 * CapacityMeter — the mobile app's row of seat dots: one dot per spot (capped
 * at 8), taken seats filled taupe, open seats a pale well — and when only one
 * or two remain, the open dots glow red. Decorative: always pair with a text
 * label ("2 spots left").
 */
export function CapacityMeter({ filled, capacity, className }: CapacityMeterProps) {
  const shown = Math.min(capacity, 8);
  const takenShown = Math.round((filled / capacity) * shown);
  const spotsLeft = capacity - filled;
  const scarce = spotsLeft > 0 && spotsLeft <= 2;

  return (
    <div aria-hidden className={cn("flex items-center gap-1", className)}>
      {Array.from({ length: shown }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "size-2 rounded-full",
            i < takenShown
              ? "bg-muted-foreground/60"
              : scarce
                ? "bg-primary"
                : "bg-secondary ring-1 ring-inset ring-border"
          )}
        />
      ))}
    </div>
  );
}
