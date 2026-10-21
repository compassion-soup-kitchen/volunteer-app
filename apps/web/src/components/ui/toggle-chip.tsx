import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * A pressable choice that stays chosen: a filter pill, an availability
 * cell, an interest or skill. Chosen reads as a red wash with a red edge,
 * never solid red - the solid button stays the one primary action on the
 * page, and a row of filters would otherwise outshout it. The state comes
 * from `aria-pressed`, so what a screen reader hears and what you see can't
 * drift apart.
 */
const toggleChipVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 bg-card font-medium text-muted-foreground ring-1 ring-border transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-pressed:bg-primary-tint aria-pressed:text-primary-tint-foreground aria-pressed:ring-primary/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      size: {
        // Filter pills and weekday pickers.
        default: "h-9 rounded-md px-4 text-sm",
        // Tags in a wrapping cloud - skills.
        sm: "h-7 rounded-sm px-2.5 text-xs font-semibold [&_svg:not([class*='size-'])]:size-3",
        // A cell in a grid, sized by the grid.
        cell: "h-10 rounded-md text-xs",
        // A described option: a title over a line of detail.
        card: "items-start justify-between gap-2 rounded-lg p-4 text-left text-sm text-foreground hover:bg-muted/50 aria-pressed:text-foreground aria-pressed:hover:bg-primary-tint",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

function ToggleChip({
  className,
  size = "default",
  pressed,
  ...props
}: Omit<React.ComponentProps<"button">, "aria-pressed"> &
  VariantProps<typeof toggleChipVariants> & { pressed: boolean }) {
  return (
    <button
      type="button"
      data-slot="toggle-chip"
      data-size={size}
      aria-pressed={pressed}
      className={cn(toggleChipVariants({ size }), className)}
      {...props}
    />
  )
}

export { ToggleChip, toggleChipVariants }
