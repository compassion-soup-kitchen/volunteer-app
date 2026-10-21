import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { Eyebrow } from "@/components/brand/eyebrow";
import { IconChip } from "@/components/brand/icon-chip";
import { StatFigure } from "@/components/brand/stat-figure";

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  /** Small muted suffix on the figure, e.g. "h" or "%". */
  unit?: string;
  sublabel: string;
  icon: React.ComponentType;
  /**
   * The chip stays neutral unless the figure asks for something - a warning
   * when there's work waiting. Colour that only decorates teaches people to
   * ignore it.
   */
  tone?: "neutral" | "warning";
  /** Makes the whole card a link to where the figure comes from. */
  href?: string;
}

/**
 * StatCard - one headline figure in a row of four (staff dashboard, reports).
 *
 * The figure is drawn first, beside the chip, so every card in a row puts it
 * on the same line: a label long enough to wrap ("Pending applications" at
 * four across) only pushes down the text beneath it, and the label has the
 * card's full width so it rarely does. The label still comes first in the
 * DOM, so a screen reader hears what the number is before the number.
 */
export function StatCard({
  label,
  value,
  unit,
  sublabel,
  icon: Icon,
  tone = "neutral",
  href,
}: StatCardProps) {
  const body = (
    <CardContent className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1">
      <Eyebrow size="sm" tone="muted" className="col-span-2 row-start-2 mt-1.5">
        {label}
      </Eyebrow>
      <StatFigure value={value} unit={unit} className="row-start-1" />
      <IconChip tone={tone} size="sm" className="row-start-1">
        <Icon />
      </IconChip>
      <p className="col-span-2 row-start-3 text-xs text-muted-foreground">{sublabel}</p>
    </CardContent>
  );

  return href ? (
    <Card className="transition-colors hover:ring-input">
      <Link
        href={href}
        className="block focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      >
        {body}
      </Link>
    </Card>
  ) : (
    <Card>{body}</Card>
  );
}
