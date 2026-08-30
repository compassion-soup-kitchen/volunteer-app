"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/brand/status-badge";
import { StatFigure } from "@/components/brand/stat-figure";
import {
  RiArchiveLine,
  RiEditLine,
  RiInboxUnarchiveLine,
  RiLoader4Line,
  RiPenNibLine,
  RiRefreshLine,
  RiSaveLine,
} from "@remixicon/react";
import {
  setAgreementArchived,
  setAgreementReAckRequired,
  updateAgreementTemplate,
  type AgreementDetail,
} from "@/lib/document-actions";
import type { AgreementTemplateInput } from "@/lib/agreement-templates";
import { agreementLabel } from "@/lib/agreement-labels";
import { AgreementFields } from "../agreement-fields";

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]!.toUpperCase())
      .join("") || "?"
  );
}

function formatDate(value: Date | string) {
  return new Date(value).toLocaleDateString("en-NZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function AgreementDetailView({ detail }: { detail: AgreementDetail }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<AgreementTemplateInput>({
    title: detail.title,
    content: detail.content,
    version: detail.version,
    requiresSignature: detail.requiresSignature,
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const retired = !!detail.archivedAt;
  const label = agreementLabel(detail.agreementType, detail.title);

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await updateAgreementTemplate(detail.agreementType, draft);
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }
      toast.success("Agreement updated");
      setEditing(false);
    });
  }

  function handleAskEveryoneAgain() {
    startTransition(async () => {
      await setAgreementReAckRequired(detail.agreementType, true);
      toast.success("Everyone has been asked to confirm this again");
    });
  }

  function handleArchive(archived: boolean) {
    startTransition(async () => {
      await setAgreementArchived(detail.agreementType, archived);
      toast.success(archived ? "Agreement retired" : "Agreement restored");
      if (archived) router.push("/staff/documents");
    });
  }

  const signedOutdated = detail.volunteers.filter(
    (v) => v.signedVersion && !v.isCurrent
  );
  const unsigned = detail.volunteers.filter((v) => !v.signedVersion);
  const awaiting = detail.volunteers.filter((v) => v.needsAcknowledgement);
  const confirmed = detail.volunteers.filter((v) => !v.needsAcknowledgement);

  return (
    <div className="space-y-6">
      {/* Template */}
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            {label}
            {retired && (
              <Badge variant="neutral">
                <RiArchiveLine />
                Retired
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Version {detail.version} · Updated {formatDate(detail.updatedAt)} ·{" "}
            {detail.requiresSignature
              ? "Tick and signature"
              : "Tick to confirm"}
          </CardDescription>
          {!editing && (
            <CardAction>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDraft({
                    title: detail.title,
                    content: detail.content,
                    version: detail.version,
                    requiresSignature: detail.requiresSignature,
                  });
                  setError(null);
                  setEditing(true);
                }}
              >
                <RiEditLine className="size-3.5" />
                Edit
              </Button>
            </CardAction>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {retired && !editing && (
            <p className="rounded-lg border border-border bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">
              Volunteers no longer see this agreement and it does not count
              towards what they owe. The confirmations already on record are
              kept.
            </p>
          )}

          {editing ? (
            <>
              <AgreementFields
                idPrefix={`edit-${detail.agreementType}`}
                value={draft}
                onChange={setDraft}
                disabled={isPending}
                versionHint="Bumping the version records what people sign against. It does not, on its own, ask anyone to confirm again - use “Ask everyone again” for that."
              />

              {error ? (
                <p role="alert" className="text-sm font-medium text-destructive">
                  {error}
                </p>
              ) : null}

              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={isPending}>
                  {isPending ? (
                    <RiLoader4Line className="size-3.5 animate-spin" />
                  ) : (
                    <RiSaveLine className="size-3.5" />
                  )}
                  Save changes
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setError(null);
                    setEditing(false);
                  }}
                  disabled={isPending}
                >
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <div className="max-h-64 overflow-y-auto rounded-md bg-muted p-4 text-sm/relaxed whitespace-pre-wrap">
              {detail.content}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Asking everyone again / retiring */}
      {!editing && (
        <Card>
          <CardHeader>
            <CardTitle>Managing this agreement</CardTitle>
            <CardDescription>
              {detail.requiresReAck && detail.reAckSetAt
                ? `Everyone was asked to confirm again on ${formatDate(detail.reAckSetAt)}. ${awaiting.length} still to do.`
                : "Volunteers confirm an agreement once. Ask again when the wording changes in a way they need to see."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {!retired && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" disabled={isPending}>
                    <RiRefreshLine className="size-3.5" />
                    Ask everyone again
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Ask everyone to confirm {label} again?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      All {detail.volunteers.length} volunteers will be asked to
                      read it and confirm again, even if they have confirmed it
                      before. Their earlier confirmations stay on record.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleAskEveryoneAgain}>
                      Ask everyone
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {retired ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleArchive(false)}
                disabled={isPending}
              >
                <RiInboxUnarchiveLine className="size-3.5" />
                Restore
              </Button>
            ) : (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" disabled={isPending}>
                    <RiArchiveLine className="size-3.5" />
                    Retire
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Retire {label}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      It disappears from volunteers&apos; documents and stops
                      counting towards what they owe. Nothing is deleted - the
                      confirmations already recorded are kept, and you can
                      restore it at any time.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleArchive(true)}>
                      Retire agreement
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </CardContent>
        </Card>
      )}

      {/* Who has confirmed */}
      <Card>
        <CardHeader>
          <CardTitle>Who has confirmed</CardTitle>
          <CardDescription>
            {detail.requiresSignature
              ? "Volunteers tick to confirm they have read it, and draw a signature."
              : "Volunteers tick to confirm they have read and understood it."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            <div>
              <p className="eyebrow text-[0.62rem] text-muted-foreground">
                Confirmed
              </p>
              <StatFigure
                size="md"
                value={confirmed.length}
                unit={`/${detail.volunteers.length}`}
                className="mt-1"
              />
            </div>
            {awaiting.length > 0 && (
              <div>
                <p className="eyebrow text-[0.62rem] text-muted-foreground">
                  Still to confirm
                </p>
                <StatFigure size="md" value={awaiting.length} className="mt-1" />
              </div>
            )}
            {signedOutdated.length > 0 && (
              <div>
                <p className="eyebrow text-[0.62rem] text-muted-foreground">
                  Older version
                </p>
                <StatFigure
                  size="md"
                  value={signedOutdated.length}
                  className="mt-1"
                />
              </div>
            )}
            {unsigned.length > 0 && (
              <div>
                <p className="eyebrow text-[0.62rem] text-muted-foreground">
                  Never confirmed
                </p>
                <StatFigure size="md" value={unsigned.length} className="mt-1" />
              </div>
            )}
          </div>
        </CardContent>

        <div className="border-t border-border">
          <ul className="divide-y divide-border">
            {detail.volunteers.map((vol) => (
              <li key={vol.id} className="flex items-center gap-3 px-5 py-3">
                <span
                  aria-hidden
                  className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground"
                >
                  {initials(vol.userName)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {vol.userName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {vol.signedAt
                      ? `Confirmed ${formatDate(vol.signedAt)}`
                      : vol.userEmail}
                  </p>
                </div>
                {vol.needsAcknowledgement ? (
                  <StatusBadge
                    status="NOT_STARTED"
                    label={vol.signedVersion ? "Awaiting" : "Not confirmed"}
                  />
                ) : vol.isCurrent ? (
                  <StatusBadge
                    status="COMPLETED"
                    label={`Confirmed v${vol.signedVersion}`}
                  />
                ) : (
                  <StatusBadge
                    status="PENDING"
                    label={`v${vol.signedVersion} · older`}
                  />
                )}
              </li>
            ))}
          </ul>

          {detail.volunteers.length === 0 && (
            <p className="px-5 py-6 text-center text-sm text-muted-foreground">
              No active volunteers
            </p>
          )}
        </div>
      </Card>

      {detail.requiresSignature && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <RiPenNibLine className="size-3.5" aria-hidden />
          This agreement also asks for a drawn signature.
        </p>
      )}
    </div>
  );
}
