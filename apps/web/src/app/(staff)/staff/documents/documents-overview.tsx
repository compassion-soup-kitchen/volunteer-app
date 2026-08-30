"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IconChip } from "@/components/brand/icon-chip";
import { StatFigure } from "@/components/brand/stat-figure";
import {
  RiFileTextLine,
  RiArrowRightSLine,
  RiPenNibLine,
  RiArchiveLine,
} from "@remixicon/react";
import type { AgreementOverview } from "@/lib/document-actions";
import { agreementLabel } from "@/lib/agreement-labels";

function AgreementRow({ agreement }: { agreement: AgreementOverview }) {
  const retired = !!agreement.archivedAt;
  const label = agreementLabel(agreement.agreementType, agreement.title);

  return (
    <li>
      <Link
        href={`/staff/documents/${agreement.agreementType}`}
        className="group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-secondary/40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      >
        <IconChip tone={retired ? "neutral" : "brand"}>
          {retired ? <RiArchiveLine /> : <RiFileTextLine />}
        </IconChip>
        <div className="min-w-0 flex-1">
          <p className="truncate font-serif text-base font-medium tracking-tight">
            {label}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            Version {agreement.version}
            {" · "}
            {agreement.requiresSignature ? "Tick and sign" : "Tick to confirm"}
          </p>
        </div>

        <div className="hidden shrink-0 items-center gap-2 md:flex">
          {agreement.requiresSignature && !retired && (
            <Badge variant="neutral" title="Volunteers also draw a signature">
              <RiPenNibLine />
              Signed
            </Badge>
          )}
          {!retired && agreement.pendingReAckCount > 0 && (
            <Badge variant="warning">
              {agreement.pendingReAckCount} to confirm
            </Badge>
          )}
          {!retired &&
            agreement.pendingReAckCount === 0 &&
            agreement.signedOutdatedCount > 0 && (
              <Badge variant="neutral">
                {agreement.signedOutdatedCount} on an older version
              </Badge>
            )}
        </div>

        {retired ? (
          <Badge variant="neutral" className="shrink-0">
            <RiArchiveLine />
            Retired
          </Badge>
        ) : (
          <div className="shrink-0 text-right">
            <StatFigure
              size="md"
              value={agreement.confirmedCount}
              unit={`/${agreement.totalVolunteers}`}
            />
            <p className="text-[0.68rem] text-muted-foreground">confirmed</p>
          </div>
        )}

        <RiArrowRightSLine
          className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      </Link>
    </li>
  );
}

export function DocumentsOverview({
  agreements,
}: {
  agreements: AgreementOverview[];
}) {
  const active = agreements.filter((a) => !a.archivedAt);
  const retired = agreements.filter((a) => a.archivedAt);

  if (agreements.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <IconChip size="lg">
            <RiFileTextLine />
          </IconChip>
          <div>
            <p className="font-serif text-lg font-medium tracking-tight">
              No agreements yet
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add your code of conduct, safeguarding policy, or anything else
              volunteers need to read and confirm.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {active.length > 0 && (
        <Card>
          <ul className="divide-y divide-border">
            {active.map((agreement) => (
              <AgreementRow
                key={agreement.agreementType}
                agreement={agreement}
              />
            ))}
          </ul>
        </Card>
      )}

      {active.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Every agreement is retired. Add one, or restore a retired agreement
            below.
          </CardContent>
        </Card>
      )}

      {retired.length > 0 && (
        <div className="space-y-2">
          <p className="eyebrow text-[0.62rem] text-muted-foreground">
            Retired
          </p>
          <Card className="opacity-80">
            <ul className="divide-y divide-border">
              {retired.map((agreement) => (
                <AgreementRow
                  key={agreement.agreementType}
                  agreement={agreement}
                />
              ))}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}
