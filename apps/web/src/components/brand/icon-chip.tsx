import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const iconChipVariants = cva(
  "flex shrink-0 items-center justify-center rounded-md [&_svg]:shrink-0",
  {
    variants: {
      tone: {
        brand: "bg-primary-tint text-primary-tint-foreground",
        neutral: "bg-neutral-tint text-neutral-tint-foreground",
        success: "bg-success-tint text-success-tint-foreground",
        warning: "bg-warning-tint text-warning-tint-foreground",
        info: "bg-info-tint text-info-tint-foreground",
        destructive: "bg-destructive-tint text-destructive-tint-foreground",
        /** On ink cards — translucent paper wash. */
        onInk: "bg-ink-foreground/12 text-ink-foreground",
      },
      size: {
        sm: "size-8 [&_svg]:size-4",
        md: "size-10 [&_svg]:size-5",
        lg: "size-12 [&_svg]:size-6",
      },
    },
    defaultVariants: {
      tone: "neutral",
      size: "md",
    },
  }
);

interface IconChipProps
  extends React.ComponentProps<"div">,
    VariantProps<typeof iconChipVariants> {}

/**
 * IconChip — the mobile app's tinted rounded-square icon anchor, used at the
 * head of list rows, stat tiles and callouts. Decorative by default
 * (aria-hidden unless given a label).
 */
export function IconChip({ tone, size, className, ...props }: IconChipProps) {
  return (
    <div
      aria-hidden={props["aria-label"] ? undefined : true}
      className={cn(iconChipVariants({ tone, size }), className)}
      {...props}
    />
  );
}
