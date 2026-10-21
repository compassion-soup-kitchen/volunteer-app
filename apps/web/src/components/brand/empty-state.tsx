import { cva } from "class-variance-authority";
import { Card } from "@/components/ui/card";
import { IconChip } from "./icon-chip";
import { Illustration, type IllustrationName } from "./illustration";
import { cn } from "@/lib/utils";

const emptyStateVariants = cva("flex", {
  variants: {
    size: {
      // A whole list or page with nothing in it: the art leads, centred.
      default: "flex-col items-center gap-4 px-6 py-10 text-center sm:py-12",
      // One section of a busier page: a quiet row that sits like a list item.
      compact: "items-start gap-3 px-5 py-4 text-left",
    },
  },
  defaultVariants: { size: "default" },
});

type EmptyStateSize = "default" | "compact";

interface EmptyStateProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** A brand spot illustration. Takes precedence over `icon`. */
  illustration?: IllustrationName;
  /** A Remix icon, set in an IconChip. */
  icon?: React.ReactNode;
  /** IconChip tone for `icon`. */
  tone?: React.ComponentProps<typeof IconChip>["tone"];
  /** What to do about it - usually one Button. */
  action?: React.ReactNode;
  size?: EmptyStateSize;
  /**
   * Leave off the card. Use inside a container that already draws one (a
   * card section, a dialog, a chart panel); the default stands alone.
   */
  bare?: boolean;
  className?: string;
}

/**
 * EmptyState - the one way to say "nothing here yet" across the volunteer and
 * staff apps: an illustration or icon, a serif title, a line of direction and
 * an optional next step. `compact` is for a single section of a page.
 */
export function EmptyState({
  title,
  description,
  illustration,
  icon,
  tone = "neutral",
  action,
  size = "default",
  bare = false,
  className,
}: EmptyStateProps) {
  const compact = size === "compact";

  const art = illustration ? (
    // The art is painted on opaque white: on a dark card it sits on a white
    // tile of its own rather than showing as a bare white rectangle.
    <div className={cn("shrink-0 overflow-hidden dark:bg-white", compact ? "rounded-lg" : "rounded-2xl")}>
      <Illustration name={illustration} size={compact ? 48 : 96} />
    </div>
  ) : icon ? (
    <IconChip tone={tone} size={compact ? "sm" : "lg"}>
      {icon}
    </IconChip>
  ) : null;

  const body = (
    <div
      data-slot="empty-state"
      className={cn(
        emptyStateVariants({ size }),
        // A lone title would sit high beside the chip; centre it instead.
        compact && !description && !action && "items-center",
        bare && className
      )}
    >
      {art}
      <div
        className={cn(
          "flex min-w-0 flex-col",
          compact ? "flex-1 items-start gap-0.5" : "max-w-sm items-center gap-1"
        )}
      >
        <p
          className={cn(
            compact
              ? "text-sm font-semibold"
              : "font-serif text-lg font-medium tracking-tight text-balance"
          )}
        >
          {title}
        </p>
        {description ? (
          <p className="text-sm text-pretty text-muted-foreground">{description}</p>
        ) : null}
        {action ? <div className={compact ? "mt-2" : "mt-3"}>{action}</div> : null}
      </div>
    </div>
  );

  if (bare) return body;

  return <Card className={cn("gap-0 py-0", className)}>{body}</Card>;
}
