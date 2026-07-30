"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IconChip } from "@/components/brand/icon-chip";
import { StatFigure } from "@/components/brand/stat-figure";
import { RiFileTextLine, RiArrowRightSLine } from "@remixicon/react";
import type { AgreementOverview } from "@/lib/document-actions";
import { agreementLabel } from "@/lib/agreement-labels";

export function DocumentsOverview({
  agreements,
}: {
  agreements: AgreementOverview[];
}) {
  if (agreements.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <IconChip size="lg">
            <RiFileTextLine />
          </IconChip>
          <div>
            <p className="font-serif text-lg font-medium tracking-tight">
              No agreement templates yet
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Templates are created automatically when the database is seeded.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <ul className="divide-y divide-border">
        {agreements.map((agreement) => (
          <li key={agreement.agreementType}>
            <Link
              href={`/staff/documents/${agreement.agreementType}`}
              className="group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-secondary/40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
            >
              <IconChip tone="brand">
                <RiFileTextLine />
              </IconChip>
              <div className="min-w-0 flex-1">
                <p className="truncate font-serif text-base font-medium tracking-tight">
                  {agreementLabel(agreement.agreementType, agreement.title)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Version {agreement.version}
                  {" · "}
                  {agreement.totalVolunteers}{" "}
                  {agreement.totalVolunteers === 1 ? "volunteer" : "volunteers"}
                </p>
              </div>
              <div className="hidden shrink-0 items-center gap-2 md:flex">
                {agreement.signedOutdatedCount > 0 && (
                  <Badge variant="warning">
                    {agreement.signedOutdatedCount} outdated
                  </Badge>
                )}
                {agreement.unsignedCount > 0 && (
                  <Badge variant="neutral">
                    {agreement.unsignedCount} not signed
                  </Badge>
                )}
              </div>
              <div className="shrink-0 text-right">
                <StatFigure
                  size="md"
                  value={agreement.signedCurrentCount}
                  unit={`/${agreement.totalVolunteers}`}
                />
                <p className="text-[0.68rem] text-muted-foreground">
                  signed current
                </p>
              </div>
              <RiArrowRightSLine
                className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
