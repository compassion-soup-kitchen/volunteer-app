import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const cardVariants = cva(
  "group/card relative flex flex-col gap-4 overflow-hidden rounded-xl text-sm/relaxed py-5 has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:gap-3 data-[size=sm]:py-4 data-[size=sm]:has-data-[slot=card-footer]:pb-0",
  {
    variants: {
      variant: {
        // White paper card ringed by the warm hairline — the signature container.
        default: "bg-card text-card-foreground ring-1 ring-border",
        // Recessed warm well for nested / quiet blocks. No border.
        muted: "bg-muted text-foreground",
        // Deep cocoa feature card with a faint red corner glow — the hero device.
        ink: "rounded-2xl bg-ink text-ink-foreground shadow-md before:pointer-events-none before:absolute before:-top-20 before:-right-16 before:size-56 before:rounded-full before:bg-[#e4002b]/25 before:blur-3xl",
        // Soft red wash callout for the one brand moment per page.
        tint: "bg-primary-tint text-foreground ring-1 ring-primary/15 dark:ring-primary/25",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Card({
  className,
  size = "default",
  variant = "default",
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof cardVariants> & { size?: "default" | "sm" }) {
  return (
    <div
      data-slot="card"
      data-size={size}
      data-variant={variant}
      className={cn(cardVariants({ variant }), className)}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "group/card-header @container/card-header grid auto-rows-min items-start gap-1 px-5 group-data-[size=sm]/card:px-4 has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-4 group-data-[size=sm]/card:[.border-b]:pb-3",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "font-serif text-lg/snug font-medium tracking-tight group-data-[size=sm]/card:text-base",
        className
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn(
        "text-sm/relaxed text-muted-foreground group-data-[variant=ink]/card:text-ink-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-5 group-data-[size=sm]/card:px-4", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center border-t p-5 group-data-[size=sm]/card:p-4 group-data-[variant=ink]/card:border-ink-foreground/15",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
