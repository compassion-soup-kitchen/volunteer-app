import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Loading placeholders that share the real components' boxes, so a route's
 * `loading.tsx` can sketch the page it stands in for and nothing jumps when
 * the data lands. Compose these rather than sizing bare Skeletons per page.
 */

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

/**
 * The outermost wrapper of every `loading.tsx`: announces the wait once to a
 * screen reader and keeps the placeholders themselves out of the tree.
 */
export function PageSkeleton({ className, children }: React.ComponentProps<"div">) {
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">Loading…</span>
      <div aria-hidden className={cn("space-y-6", className)}>
        {children}
      </div>
    </div>
  );
}

/**
 * One line of text: a box exactly one line-height tall in the given type
 * classes, with a bar sized to the font. Passing the real text's classes is
 * what keeps a skeleton header the same height as the header it becomes.
 */
export function TextLine({ className, bar }: { className?: string; bar?: string }) {
  return (
    <div className={cn("flex h-lh items-center", className)}>
      <Skeleton className={cn("h-[0.8em] max-w-full", bar)} />
    </div>
  );
}

interface PageHeaderSkeletonProps {
  /** The page has a back chevron (shown from sm up). */
  back?: boolean;
  /** How many action buttons sit on the right. */
  actions?: number;
  /** How many small badges sit on the right, before any buttons. */
  badges?: number;
  description?: boolean;
  className?: string;
}

/** Stands in for PageHeader: eyebrow, serif title and supporting line. */
export function PageHeaderSkeleton({
  back = false,
  actions = 0,
  badges = 0,
  description = true,
  className,
}: PageHeaderSkeletonProps) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-4", className)}>
      <div className="flex min-w-0 flex-1 items-start gap-3">
        {back ? <Skeleton className="mt-1 hidden size-9 shrink-0 sm:block" /> : null}
        <div className="w-full min-w-0 space-y-1">
          <TextLine className="eyebrow" bar="w-36" />
          <TextLine
            className="font-serif text-2xl sm:text-3xl"
            bar="w-56 sm:w-72"
          />
          {description ? (
            <TextLine className="text-sm sm:text-base" bar="w-full max-w-md" />
          ) : null}
        </div>
      </div>
      {actions + badges > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {range(badges).map((i) => (
            <Skeleton key={`b${i}`} className="h-6 w-20 rounded-full" />
          ))}
          {range(actions).map((i) => (
            <Skeleton key={i} className="h-10 w-32 rounded-lg" />
          ))}
        </div>
      ) : null}
    </div>
  );
}

interface SectionHeaderSkeletonProps {
  /** Draw the red overline above the title. */
  eyebrow?: boolean;
  /** A red "View all" link at the end. */
  action?: boolean;
  /** A small button at the end, for sections that own an action. */
  trailing?: boolean;
  /** The hairline rule above, as on stacked sections. */
  divider?: boolean;
  className?: string;
}

/** Stands in for SectionHeader: red overline and serif title. */
export function SectionHeaderSkeleton({
  eyebrow = true,
  action = false,
  trailing = false,
  divider = false,
  className,
}: SectionHeaderSkeletonProps) {
  return (
    <div className={cn(divider && "border-t border-border pt-6", className)}>
      <div className="flex items-end justify-between gap-3">
        <div className="space-y-0.5">
          {eyebrow ? <TextLine className="eyebrow" bar="w-24" /> : null}
          <TextLine className="font-serif text-xl" bar="w-44" />
        </div>
        {action ? <TextLine className="pb-0.5 text-sm" bar="w-16" /> : null}
        {trailing ? <Skeleton className="h-9 w-28 shrink-0" /> : null}
      </div>
    </div>
  );
}

/** One full-bleed row: icon chip, a name and a quieter second line. */
function RowSkeleton({ trailing }: { trailing: boolean }) {
  return (
    <div className="flex items-center gap-3 px-5 py-3">
      <Skeleton className="size-8 shrink-0" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <Skeleton className="h-4 w-2/5 min-w-32" />
        <Skeleton className="h-3 w-1/4 min-w-20" />
      </div>
      {trailing ? <Skeleton className="h-6 w-16 shrink-0 rounded-full" /> : null}
    </div>
  );
}

interface ListCardSkeletonProps {
  rows?: number;
  /** A CardHeader title above the rows, as on record and profile cards. */
  title?: boolean;
  /** A badge or button at the end of each row. */
  trailing?: boolean;
  className?: string;
}

/** A card of hairline-divided rows - the most common body in the app. */
export function ListCardSkeleton({
  rows = 4,
  title = false,
  trailing = false,
  className,
}: ListCardSkeletonProps) {
  return (
    <Card className={cn("gap-0", title ? "pb-0" : "py-0", className)}>
      {title ? (
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
      ) : null}
      <div className={cn("divide-y divide-border", title && "border-t border-border")}>
        {range(rows).map((i) => (
          <RowSkeleton key={i} trailing={trailing} />
        ))}
      </div>
    </Card>
  );
}

/** A card of a few lines of text - a notice, a form section, a callout. */
export function TextCardSkeleton({
  lines = 3,
  title = true,
  className,
}: {
  lines?: number;
  title?: boolean;
  className?: string;
}) {
  return (
    <Card className={className}>
      {title ? (
        <CardHeader>
          <Skeleton className="h-5 w-44" />
        </CardHeader>
      ) : null}
      <CardContent className="space-y-2.5">
        {range(lines).map((i) => (
          <Skeleton key={i} className={cn("h-4", i === lines - 1 ? "w-3/5" : "w-full")} />
        ))}
      </CardContent>
    </Card>
  );
}

/** A form: labelled fields in a card, ending on its submit button. */
export function FormCardSkeleton({
  fields = 4,
  title = false,
  className,
}: {
  fields?: number;
  /** A bordered CardHeader title, as on settings cards. */
  title?: boolean;
  className?: string;
}) {
  return (
    <Card className={className}>
      {title ? (
        <CardHeader className="border-b">
          <Skeleton className="h-5 w-44" />
        </CardHeader>
      ) : null}
      <CardContent className="space-y-5">
        {range(fields).map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-11 w-full" />
          </div>
        ))}
        <Skeleton className="h-10 w-36 rounded-lg" />
      </CardContent>
    </Card>
  );
}

/** A row of stat tiles: label, serif figure, quiet sub-label. */
export function StatTilesSkeleton({
  count = 4,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-3 sm:grid-cols-2 xl:grid-cols-4", className)}>
      {range(count).map((i) => (
        <Card key={i}>
          <CardContent className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-1.5">
              {/* Labels wrap to two lines at most widths */}
              <div>
                <TextLine className="eyebrow text-[0.62rem]" bar="w-20" />
                <TextLine className="eyebrow text-[0.62rem]" bar="w-14" />
              </div>
              <TextLine className="font-serif text-3xl leading-none" bar="w-12" />
              <TextLine className="text-xs" bar="w-24" />
            </div>
            <Skeleton className="size-8 shrink-0" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/** A right-aligned row of buttons, e.g. the "New pānui" above a list. */
export function ActionBarSkeleton({
  buttons = 1,
  className,
}: {
  buttons?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap justify-end gap-2", className)}>
      {range(buttons).map((i) => (
        <Skeleton key={i} className="h-10 w-36 rounded-lg" />
      ))}
    </div>
  );
}

/** A card-sized block for heroes, charts and anything drawn rather than listed. */
export function BlockSkeleton({ className }: { className?: string }) {
  return <Skeleton className={cn("h-40 w-full rounded-xl", className)} />;
}
