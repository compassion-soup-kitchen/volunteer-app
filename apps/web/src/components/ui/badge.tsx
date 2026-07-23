import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-sm px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap transition-all focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&>svg]:pointer-events-none [&>svg]:size-3.5!",
  {
    variants: {
      variant: {
        default: "bg-primary-tint text-primary-tint-foreground [a]:hover:bg-primary/20",
        solid: "bg-primary text-primary-foreground",
        secondary:
          "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
        destructive:
          "bg-destructive-tint text-destructive-tint-foreground [a]:hover:bg-destructive/20",
        outline:
          "bg-card text-muted-foreground ring-1 ring-border [a]:hover:text-foreground",
        ghost:
          "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
        link: "text-primary underline-offset-4 hover:underline",
        info: "bg-info-tint text-info-tint-foreground",
        success: "bg-success-tint text-success-tint-foreground",
        warning: "bg-warning-tint text-warning-tint-foreground",
        amber: "bg-warning-tint text-warning-tint-foreground",
        neutral: "bg-neutral-tint text-neutral-tint-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
