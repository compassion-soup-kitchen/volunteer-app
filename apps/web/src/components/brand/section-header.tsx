import Link from "next/link";
import { RiArrowRightSLine } from "@remixicon/react";
import { Eyebrow } from "./eyebrow";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  /** Bilingual Te Reo overline, e.g. "Tō takoha". Rendered in red. */
  eyebrow?: React.ReactNode;
  /** Serif section title, e.g. "Your contribution". */
  title: React.ReactNode;
  /** Optional red trailing action, e.g. { label: "All shifts", href: "/shifts" }. */
  action?: { label: string; href: string };
  /** Trailing control for sections that own an action rather than a link. */
  trailing?: React.ReactNode;
  /** Draw a hairline rule above the header to separate stacked sections. */
  divider?: boolean;
  className?: string;
}

/**
 * SectionHeader — the in-app unit between content blocks, ported from the
 * mobile app: [hairline] → red overline / serif title …… red "View all ›".
 */
export function SectionHeader({
  eyebrow,
  title,
  action,
  trailing,
  divider = false,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn(divider && "border-t border-border pt-6", className)}>
      <div className="flex items-end justify-between gap-3">
        <div className="space-y-0.5">
          {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
          <h2 className="font-serif text-xl font-medium tracking-tight">{title}</h2>
        </div>
        {action ? (
          <Link
            href={action.href}
            className="inline-flex shrink-0 items-center gap-0.5 rounded-sm pb-0.5 text-sm font-semibold text-primary transition-colors hover:text-primary/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {action.label}
            <RiArrowRightSLine className="size-4" aria-hidden />
          </Link>
        ) : null}
        {trailing ? <div className="shrink-0">{trailing}</div> : null}
      </div>
    </div>
  );
}
