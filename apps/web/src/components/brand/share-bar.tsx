import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const shareBarVariants = cva("overflow-hidden rounded-full bg-muted", {
  variants: {
    size: {
      /** Quiet ledger rule under a row that already leads with its figure. */
      sm: "h-1.5",
      /** The bar is the point - a chart row compared against its neighbours. */
      md: "h-2.5",
    },
  },
  defaultVariants: { size: "sm" },
});

interface ShareBarProps extends VariantProps<typeof shareBarVariants> {
  /** How much of the well to fill, 0-100. Out-of-range values are clamped. */
  percent: number;
  /** Fill colour, e.g. `bg-chart-1`. */
  fillClassName?: string;
  className?: string;
}

/**
 * ShareBar - a horizontal bar in a pale well, for "how much of the whole" or
 * "how this row compares" ledgers. Decorative: always pair it with the figure
 * it draws, in text.
 */
export function ShareBar({ percent, size, fillClassName, className }: ShareBarProps) {
  const width = Math.min(Math.max(percent, 0), 100);
  return (
    <div aria-hidden className={cn(shareBarVariants({ size }), className)}>
      <div
        className={cn("h-full rounded-full bg-chart-1", fillClassName)}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
