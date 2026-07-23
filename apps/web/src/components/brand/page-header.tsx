import Link from "next/link";
import { RiArrowLeftLine } from "@remixicon/react";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "./eyebrow";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  /** Optional bilingual eyebrow, e.g. "Ngā wāhi mahi · Roster". */
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** When set, shows a back chevron (desktop) linking here. */
  backHref?: string;
  /** Right-aligned actions (buttons, filters). */
  actions?: React.ReactNode;
  className?: string;
}

/**
 * PageHeader — the standard page opening across the volunteer and staff apps:
 * optional back chevron, red Te Reo eyebrow, Newsreader serif title, and a
 * quiet supporting line.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  backHref,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-4", className)}>
      <div className="flex items-start gap-3">
        {backHref ? (
          <Button
            variant="ghost"
            size="icon-sm"
            className="mt-1 hidden shrink-0 sm:inline-flex"
            asChild
          >
            <Link href={backHref} aria-label="Back">
              <RiArrowLeftLine className="size-4" />
            </Link>
          </Button>
        ) : null}
        <div className="space-y-1">
          {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
          <h1 className="font-serif text-2xl font-medium tracking-tight text-balance sm:text-3xl">
            {title}
          </h1>
          {description ? (
            <p className="text-sm text-muted-foreground sm:text-base">{description}</p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
