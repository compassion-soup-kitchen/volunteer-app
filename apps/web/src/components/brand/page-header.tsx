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
 * PageHeader — the standard page heading across the volunteer and staff apps:
 * optional back chevron, eyebrow, Fraunces serif title, and description.
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
            className="mt-1.5 hidden shrink-0 sm:inline-flex"
            asChild
          >
            <Link href={backHref} aria-label="Back">
              <RiArrowLeftLine className="size-4" />
            </Link>
          </Button>
        ) : null}
        <div className="space-y-1">
          {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
          <h1 className="font-serif text-3xl font-light tracking-tight text-balance">
            {title}
          </h1>
          {description ? (
            <p className="text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
