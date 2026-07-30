import { IconChip } from "./icon-chip";
import { cn } from "@/lib/utils";

/**
 * The hairline-divided body shared by every card whose rows run to the card's
 * edges. `data-slot="bleed-list"` is what `Card` looks for to trim its own
 * bottom padding - the rows already carry their own, so the card's full pb-5
 * underneath reads as a dead gap. Marking the list means no call site has to
 * decide, and an empty state (a `CardContent` instead) keeps normal padding
 * without anyone thinking about it.
 */
const bleedListClass = "divide-y divide-border border-t border-border";

/** A card body of full-bleed rows. */
export function BleedList({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="bleed-list"
      className={cn(bleedListClass, className)}
      {...props}
    />
  );
}

export type DetailFact = {
  label: string;
  value: React.ReactNode;
  /** Optional tinted anchor, matching the list rows used elsewhere. */
  icon?: React.ComponentType<{ className?: string }>;
};

interface DetailListProps {
  facts: DetailFact[];
  className?: string;
}

/**
 * DetailList - the label-over-value rows a record card is built from: contact
 * details, an emergency contact, an account summary.
 *
 * Marked up as a `dl` so a screen reader reads "Phone, 021 555 0100" rather
 * than two loose lines, and values wrap instead of truncating - a long address
 * is exactly the row you can least afford to cut off.
 */
export function DetailList({ facts, className }: DetailListProps) {
  return (
    <dl
      data-slot="bleed-list"
      className={cn(bleedListClass, className)}
    >
      {facts.map((fact) => (
        <div key={fact.label} className="flex items-center gap-3 px-5 py-3">
          {fact.icon ? (
            <IconChip size="sm">
              <fact.icon />
            </IconChip>
          ) : null}
          <div className="min-w-0">
            <dt className="eyebrow text-[0.62rem] text-muted-foreground">
              {fact.label}
            </dt>
            <dd className="text-sm font-medium break-words">{fact.value}</dd>
          </div>
        </div>
      ))}
    </dl>
  );
}
