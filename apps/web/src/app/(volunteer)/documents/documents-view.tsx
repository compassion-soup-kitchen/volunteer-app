"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  RiArrowDownLine,
  RiCheckLine,
  RiFileTextLine,
  RiLoader4Line,
} from "@remixicon/react";
import { IconChip } from "@/components/brand/icon-chip";
import { SignaturePad } from "@/components/signature-pad";
import {
  acknowledgeAgreement,
  type VolunteerAgreementStatus,
} from "@/lib/document-actions";
import { agreementLabel } from "@/lib/agreement-labels";

function formatDate(value: Date | string) {
  return new Date(value).toLocaleDateString("en-NZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function agreementCaption(agreement: VolunteerAgreementStatus) {
  if (agreement.needsResign) {
    return agreement.signedVersion
      ? "Please read and confirm this again"
      : `Version ${agreement.currentVersion} · not yet confirmed`;
  }
  if (agreement.signedAt) {
    const date = formatDate(agreement.signedAt);
    return agreement.signedVersion
      ? `Confirmed ${date} · Version ${agreement.signedVersion}`
      : `Confirmed ${date}`;
  }
  return `Version ${agreement.currentVersion}`;
}

/**
 * Read, then confirm.
 *
 * The tick box stays disabled until the wording has actually been scrolled to
 * the end - "I have read and understand" should not be something you can agree
 * to without the words passing your eyes. Short agreements that fit without
 * scrolling count as read immediately, so the gate never becomes a dead end.
 *
 * Split from the dialog shell so that opening a different agreement mounts a
 * fresh form: a tick carried over from the last one would be a confirmation
 * nobody made.
 */
function AcknowledgeForm({
  agreement,
  busyRef,
  onDone,
  onCancel,
}: {
  agreement: VolunteerAgreementStatus;
  /** Lets the shell refuse to close mid-save without re-rendering it. */
  busyRef: React.RefObject<boolean>;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [hasRead, setHasRead] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const markReadIfAtEnd = useCallback((el: HTMLElement | null) => {
    if (!el) return;
    // 8px of slack: sub-pixel heights mean scrollTop rarely lands exactly.
    if (el.scrollHeight - el.clientHeight - el.scrollTop <= 8) setHasRead(true);
  }, []);

  // A body short enough not to scroll counts as read as soon as it is shown.
  const attachScroller = useCallback(
    (el: HTMLDivElement | null) => markReadIfAtEnd(el),
    [markReadIfAtEnd]
  );

  const label = agreementLabel(agreement.agreementType, agreement.title);
  const needsSignature = agreement.requiresSignature;
  const canConfirm = confirmed && (!needsSignature || !!signature);

  function handleConfirm() {
    setError(null);
    busyRef.current = true;
    startTransition(async () => {
      const result = await acknowledgeAgreement(
        agreement.agreementType,
        signature
      );
      busyRef.current = false;
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }
      toast.success(`${label} confirmed`);
      onDone();
    });
  }

  return (
    <>
      <DialogHeader className="shrink-0">
        <DialogTitle>{label}</DialogTitle>
        <DialogDescription>
          {agreement.signedVersion
            ? "Please read this through again, then confirm."
            : "Please read this through, then confirm."}
        </DialogDescription>
      </DialogHeader>

      {/* The wording is the only part that gives ground: it takes what is left
          and shrinks when the signature pad opens, down to a floor that is
          still readable. Everything below it is `shrink-0`, because a squashed
          tick box once ended up rendered on top of the wording. */}
      <div className="relative min-h-32 flex-1 overflow-hidden">
        <div
          ref={attachScroller}
          onScroll={(e) => markReadIfAtEnd(e.currentTarget)}
          tabIndex={0}
          aria-label={`${label} wording`}
          className="h-full overflow-y-auto rounded-lg bg-muted p-4 pb-10 text-sm/relaxed whitespace-pre-wrap text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
        >
          {agreement.content}
        </div>
        {!hasRead && (
          <p
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 rounded-b-lg bg-gradient-to-t from-muted via-muted to-transparent pt-6 pb-2 text-xs font-medium text-muted-foreground"
          >
            <RiArrowDownLine className="size-3.5 animate-bounce motion-reduce:animate-none" />
            Scroll to the end to continue
          </p>
        )}
      </div>

      <div className="shrink-0 space-y-4 pt-5">
        <div className="flex items-start gap-3">
          <Checkbox
            id="agreement-understood"
            checked={confirmed}
            onCheckedChange={(checked) => setConfirmed(checked === true)}
            disabled={!hasRead || isPending}
            className="mt-0.5 size-5"
          />
          <Label
            htmlFor="agreement-understood"
            className="text-sm leading-snug font-medium"
          >
            I have read and understand {label}.
          </Label>
        </div>

        {needsSignature && confirmed && (
          <SignaturePad
            onSignatureChange={setSignature}
            label="Draw your signature"
          />
        )}

        {error ? (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}
      </div>

      <DialogFooter className="shrink-0 pt-5">
        <Button variant="ghost" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button onClick={handleConfirm} disabled={!canConfirm || isPending}>
          {isPending ? (
            <RiLoader4Line className="size-3.5 animate-spin" />
          ) : (
            <RiCheckLine className="size-3.5" />
          )}
          Confirm
        </Button>
      </DialogFooter>
    </>
  );
}

function AcknowledgeDialog({
  agreement,
  open,
  onOpenChange,
}: {
  agreement: VolunteerAgreementStatus | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const busyRef = useRef(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (busyRef.current) return;
        onOpenChange(next);
      }}
    >
      <DialogContent className="flex max-h-[90dvh] flex-col gap-0 sm:max-w-lg">
        {agreement ? (
          <AcknowledgeForm
            key={agreement.agreementType}
            agreement={agreement}
            busyRef={busyRef}
            onDone={() => onOpenChange(false)}
            onCancel={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export function DocumentsView({
  agreements,
}: {
  agreements: VolunteerAgreementStatus[];
}) {
  const [openType, setOpenType] = useState<string | null>(null);

  const openAgreement =
    agreements.find((a) => a.agreementType === openType) ?? null;

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
              Agreements you confirm will appear here.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <ul className="divide-y divide-border">
          {agreements.map((agreement) => {
            const label = agreementLabel(
              agreement.agreementType,
              agreement.title
            );
            const status = agreement.needsResign ? (
              <Badge variant="warning">Read and confirm</Badge>
            ) : (
              <Badge variant="success">
                <RiCheckLine />
                Confirmed
              </Badge>
            );
            return (
              <li key={agreement.agreementType}>
                {/* One target for the whole row - reading and confirming are
                    the same journey, and a tall row is far kinder on a phone
                    than a small button beside a separate "view" hit area.
                    The status sits under the text on a narrow screen: inline,
                    it squeezed a two-word policy name into three wrapped
                    lines. */}
                <button
                  type="button"
                  onClick={() => setOpenType(agreement.agreementType)}
                  className="group flex w-full items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-secondary/40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                >
                  <IconChip
                    tone={agreement.needsResign ? "warning" : "neutral"}
                    size="sm"
                  >
                    <RiFileTextLine />
                  </IconChip>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold transition-colors group-hover:text-primary">
                      {label}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {agreementCaption(agreement)}
                    </p>
                    <div className="mt-2 sm:hidden">{status}</div>
                  </div>
                  <div className="hidden shrink-0 sm:block">{status}</div>
                </button>
              </li>
            );
          })}
        </ul>
      </Card>

      <AcknowledgeDialog
        agreement={openAgreement}
        open={!!openType}
        onOpenChange={(next) => !next && setOpenType(null)}
      />
    </>
  );
}
