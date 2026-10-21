import { cn } from "@/lib/utils";

/**
 * MissionRail - the red bar down the left edge that marks the volunteer's own
 * commitment: a shift they're on, training they've booked, an offer held for
 * them. Sits inside any `relative` container (a Card already is one).
 */
export function MissionRail({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden
      data-slot="mission-rail"
      className={cn("absolute inset-y-0 left-0 w-1 bg-primary", className)}
      {...props}
    />
  );
}
