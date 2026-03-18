"use client";

import { useState, useTransition } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  RiAlertLine,
  RiFileTextLine,
  RiLoader4Line,
  RiPenNibLine,
} from "@remixicon/react";
import { SignaturePad } from "@/components/signature-pad";
import {
  resignAgreement,
  type VolunteerAgreementStatus,
} from "@/lib/document-actions";

const TYPE_LABELS: Record<string, string> = {
  CODE_OF_CONDUCT: "Te Tikanga — Code of Conduct",
  SAFEGUARDING: "Safeguarding Policy",
  VOLUNTEER_APPLICATION: "Volunteer Application Agreement",
  POLICIES: "General Policies",
};

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
        <CardContent className="py-12 text-center">
          <RiFileTextLine className="mx-auto size-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">
            No agreements to display
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {agreements.map((agreement) => (
          <Card
            key={agreement.agreementType}
            className={
              agreement.needsResign
                ? "border-amber-500/30 bg-amber-50/30 dark:bg-amber-950/10"
                : ""
            }
          >
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
                    Version {agreement.currentVersion}
                  </p>
                </div>
              </div>
              {agreement.needsResign ? (
                <Badge
                  variant="outline"
                  className="text-xs text-amber-600 border-amber-200"
                >
                  <RiAlertLine className="mr-1 size-3" />
                  {agreement.signedVersion ? "Update needed" : "Not signed"}
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="text-xs text-green-600 border-green-200"
                >
                  <RiCheckLine className="mr-1 size-3" />
                  Signed
                </Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {agreement.signedAt && (
                <p className="text-xs text-muted-foreground">
                  Signed{" "}
                  {new Date(agreement.signedAt).toLocaleDateString("en-NZ", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                  {agreement.signedVersion &&
                    ` · Version ${agreement.signedVersion}`}
                </p>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewingContent(agreement.agreementType)}
                >
                  View Agreement
                </Button>
                {agreement.needsResign && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setSigningType(agreement.agreementType);
                      setSignature(null);
                    }}
                  >
                    <RiPenNibLine className="mr-1.5 size-3.5" />
                    {agreement.signedVersion ? "Re-sign" : "Sign"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

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
              <div className="mt-4 rounded-md border border-border bg-muted/30 p-4 text-sm leading-relaxed text-foreground whitespace-pre-wrap">
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
              Confirm Signature
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
