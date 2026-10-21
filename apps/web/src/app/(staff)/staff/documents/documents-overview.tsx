"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
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
import { BleedList } from "@/components/brand/detail-list";
import { StatusBadge } from "@/components/brand/status-badge";
import { Eyebrow } from "@/components/brand/eyebrow";
import { rowLinkVariants } from "@/components/brand/row-link";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/brand/empty-state";

function AgreementRow({ agreement }: { agreement: AgreementOverview }) {
  const retired = !!agreement.archivedAt;
  const label = agreementLabel(agreement.agreementType, agreement.title);

  return (
    <li>
      <Link
        href={`/staff/documents/${agreement.agreementType}`}
        className={cn(rowLinkVariants(), "py-3.5")}
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
            <StatusBadge
              status="NEEDS_CONFIRMING"
              label={`${agreement.pendingReAckCount} to confirm`}
            />
          )}
          {!retired &&
            agreement.pendingReAckCount === 0 &&
            agreement.signedOutdatedCount > 0 && (
              <StatusBadge
                status="OUTDATED"
                label={`${agreement.signedOutdatedCount} on an older version`}
              />
            )}
        </div>

        {retired ? (
          <StatusBadge
            status="RETIRED"
            className="shrink-0"
            label={
              <>
                <RiArchiveLine />
                Retired
              </>
            }
          />
        ) : (
          <div className="shrink-0 text-right">
            <StatFigure
              size="md"
              value={agreement.confirmedCount}
              unit={`/${agreement.totalVolunteers}`}
            />
            <p className="text-2xs text-muted-foreground">confirmed</p>
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
      <EmptyState
        icon={<RiFileTextLine />}
        title="No agreements yet"
        description="Add your code of conduct, safeguarding policy, or anything else volunteers need to read and confirm."
      />
    );
  }

  return (
    <div className="space-y-4">
      {active.length > 0 && (
        <Card>
          <BleedList>
            {active.map((agreement) => (
              <AgreementRow
                key={agreement.agreementType}
                agreement={agreement}
              />
            ))}
          </BleedList>
        </Card>
      )}

      {active.length === 0 && (
        <EmptyState
          icon={<RiFileTextLine />}
          title="Every agreement is retired"
          description="Add one, or restore a retired agreement below."
        />
      )}

      {retired.length > 0 && (
        <div className="space-y-2">
          <Eyebrow size="sm" tone="muted">
            Retired
          </Eyebrow>
          <Card className="opacity-80">
            <BleedList>
              {retired.map((agreement) => (
                <AgreementRow
                  key={agreement.agreementType}
                  agreement={agreement}
                />
              ))}
            </BleedList>
          </Card>
        </div>
      )}
    </div>
  );
}
