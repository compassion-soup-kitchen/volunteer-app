"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  RiFileTextLine,
  RiArrowRightLine,
  RiCheckLine,
  RiAlertLine,
  RiCloseLine,
} from "@remixicon/react";
import type { AgreementOverview } from "@/lib/document-actions";

const TYPE_LABELS: Record<string, string> = {
  CODE_OF_CONDUCT: "Te Tikanga — Code of Conduct",
  SAFEGUARDING: "Safeguarding Policy",
  VOLUNTEER_APPLICATION: "Volunteer Application Agreement",
  POLICIES: "General Policies",
};

export function DocumentsOverview({
  agreements,
}: {
  agreements: AgreementOverview[];
}) {
  if (agreements.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <RiFileTextLine className="mx-auto size-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">
            No agreement templates configured yet. Templates are created
            automatically when the database is seeded.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {agreements.map((agreement) => (
        <Card key={agreement.agreementType}>
          <CardHeader className="flex-row items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
                <RiFileTextLine className="size-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">
                  {TYPE_LABELS[agreement.agreementType] || agreement.title}
                </CardTitle>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Version {agreement.version}
                </p>
              </div>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link
                href={`/staff/documents/${agreement.agreementType}`}
              >
                Manage
                <RiArrowRightLine className="size-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-1.5">
                <RiCheckLine className="size-3.5 text-green-600" />
                <span className="text-sm">
                  <span className="font-mono font-medium">
                    {agreement.signedCurrentCount}
                  </span>{" "}
                  current
                </span>
              </div>
              {agreement.signedOutdatedCount > 0 && (
                <div className="flex items-center gap-1.5">
                  <RiAlertLine className="size-3.5 text-amber-600" />
                  <span className="text-sm">
                    <span className="font-mono font-medium">
                      {agreement.signedOutdatedCount}
                    </span>{" "}
                    outdated
                  </span>
                </div>
              )}
              {agreement.unsignedCount > 0 && (
                <div className="flex items-center gap-1.5">
                  <RiCloseLine className="size-3.5 text-muted-foreground" />
                  <span className="text-sm">
                    <span className="font-mono font-medium">
                      {agreement.unsignedCount}
                    </span>{" "}
                    not signed
                  </span>
                </div>
              )}
              <span className="text-sm text-muted-foreground">
                of {agreement.totalVolunteers} volunteers
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
