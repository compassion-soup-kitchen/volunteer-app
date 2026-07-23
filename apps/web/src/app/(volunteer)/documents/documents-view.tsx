"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  RiCheckLine,
  RiFileTextLine,
  RiLoader4Line,
  RiPenNibLine,
} from "@remixicon/react";
import { IconChip } from "@/components/brand/icon-chip";
import { SignaturePad } from "@/components/signature-pad";
import {
  resignAgreement,
  type VolunteerAgreementStatus,
} from "@/lib/document-actions";

const TYPE_LABELS: Record<string, string> = {
  CODE_OF_CONDUCT: "Te Tikanga · Code of Conduct",
  SAFEGUARDING: "Safeguarding Policy",
  VOLUNTEER_APPLICATION: "Volunteer Application Agreement",
  POLICIES: "General Policies",
};

function agreementCaption(agreement: VolunteerAgreementStatus) {
  if (agreement.needsResign) {
    return agreement.signedVersion
      ? `Updated to version ${agreement.currentVersion} · re-sign needed`
      : `Version ${agreement.currentVersion} · not yet signed`;
  }
  if (agreement.signedAt) {
    const date = new Date(agreement.signedAt).toLocaleDateString("en-NZ", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    return agreement.signedVersion
      ? `Signed ${date} · Version ${agreement.signedVersion}`
      : `Signed ${date}`;
  }
  return `Version ${agreement.currentVersion}`;
}

export function DocumentsView({
  agreements,
}: {
  agreements: VolunteerAgreementStatus[];
}) {
  const [signingType, setSigningType] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [viewingContent, setViewingContent] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const signingAgreement = agreements.find(
    (a) => a.agreementType === signingType
  );
  const viewingAgreement = agreements.find(
    (a) => a.agreementType === viewingContent
  );

  function handleSign() {
    if (!signingType || !signature) return;
    startTransition(async () => {
      await resignAgreement(signingType, signature);
      setSigningType(null);
      setSignature(null);
    });
  }

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
              Agreements you sign will appear here.
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
            const label =
              TYPE_LABELS[agreement.agreementType] || agreement.title;
            return (
              <li
                key={agreement.agreementType}
                className="flex items-center gap-3 px-5 py-3.5"
              >
                <button
                  type="button"
                  onClick={() => setViewingContent(agreement.agreementType)}
                  aria-label={`View ${label}`}
                  className="group flex min-w-0 flex-1 items-center gap-3 rounded-sm text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
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
                    <p className="text-xs text-muted-foreground">
                      {agreementCaption(agreement)}
                    </p>
                  </div>
                </button>
                {agreement.needsResign ? (
                  <Button
                    size="sm"
                    className="shrink-0"
                    onClick={() => {
                      setSigningType(agreement.agreementType);
                      setSignature(null);
                    }}
                  >
                    <RiPenNibLine className="size-3.5" />
                    {agreement.signedVersion ? "Re-sign" : "Sign"}
                  </Button>
                ) : (
                  <Badge variant="success" className="shrink-0">
                    <RiCheckLine />
                    Signed
                  </Badge>
                )}
              </li>
            );
          })}
        </ul>
      </Card>

      {/* View Agreement Content Dialog */}
      <AlertDialog
        open={!!viewingContent}
        onOpenChange={(open) => !open && setViewingContent(null)}
      >
        <AlertDialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {viewingAgreement
                ? TYPE_LABELS[viewingAgreement.agreementType] ||
                  viewingAgreement.title
                : ""}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="mt-4 whitespace-pre-wrap rounded-lg bg-muted p-4 text-sm leading-relaxed text-foreground">
                {viewingAgreement?.content}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Signing Dialog */}
      <AlertDialog
        open={!!signingType}
        onOpenChange={(open) => {
          if (!open && !isPending) {
            setSigningType(null);
            setSignature(null);
          }
        }}
      >
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {signingAgreement?.signedVersion ? "Re-sign" : "Sign"}{" "}
              {signingAgreement
                ? TYPE_LABELS[signingAgreement.agreementType] ||
                  signingAgreement.title
                : ""}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {signingAgreement?.signedVersion
                ? `This agreement has been updated to version ${signingAgreement.currentVersion}. Please review and re-sign.`
                : "Please draw your signature below to sign this agreement."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-2">
            <SignaturePad
              onSignatureChange={setSignature}
              label="Draw your signature"
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSign}
              disabled={!signature || isPending}
            >
              {isPending ? (
                <RiLoader4Line className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <RiPenNibLine className="mr-1.5 size-3.5" />
              )}
              Confirm signature
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
