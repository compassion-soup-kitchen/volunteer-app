"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import {
  RiAlertLine,
  RiDeleteBin6Line,
  RiInformationLine,
  RiLoader4Line,
} from "@remixicon/react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  deleteOwnAccount,
  getOwnAccountDeletionSummary,
} from "@/lib/account-actions";
import {
  matchesDeletionConfirmation,
  type OwnAccountDeletionSummary,
} from "@/lib/user-deletion";

/**
 * Erasing your own account, from the web.
 *
 * The counterpart to the mobile app's Delete account screen, and the same
 * rules underneath - both call `deleteOwnAccount`. Kept as a dialog rather
 * than its own page because, unlike the app, there is a whole page to hang it
 * off; the summary is still loaded from the server so the numbers someone
 * agrees to are real rather than described in the abstract.
 *
 * Rendered for volunteers on /profile and for staff on /staff/account, which
 * is why it lives here rather than under either route group. `deleteOwnAccount`
 * is gated on identity rather than role - it can only ever reach the caller's
 * own row - so every signed-in person needs a way to it, not just the ones who
 * happen to have a staff account page.
 */
export function DeleteAccountCard() {
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState<OwnAccountDeletionSummary | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Loaded when the dialog opens, not on page load: it is several counts, and
  // most visits to this page are to change a password.
  // Nothing is cleared here on purpose - a synchronous setState in an effect
  // cascades a re-render. Closing the dialog resets it instead, so each open
  // starts clean.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getOwnAccountDeletionSummary()
      .then((result) => {
        if (cancelled) return;
        if ("error" in result) setLoadError(result.error);
        else setSummary(result);
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError("Couldn't check this account. Please try again.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const blocker = summary?.blocker ?? null;
  const canDelete =
    summary !== null &&
    blocker === null &&
    matchesDeletionConfirmation(confirmation, summary.email);

  async function handleConfirm() {
    if (!canDelete) return;
    setDeleting(true);
    setDeleteError(null);
    const result = await deleteOwnAccount(confirmation);
    if (result.error) {
      setDeleting(false);
      setDeleteError(result.error);
      return;
    }
    // The row is gone but the session cookie isn't, so sign out explicitly -
    // otherwise every page would bounce off a session naming nobody.
    await signOut({ redirectTo: "/" });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-muted-foreground">
        Deleting your account erases it and everything recorded against it -
        your profile, shifts, training and documents. It can&apos;t be undone,
        and your hours leave the kitchen&apos;s reporting with them. If
        you&apos;re only stepping back for a while, ask a coordinator to
        archive you instead - your record stays for when you come back.
      </p>

      <AlertDialog
        open={open}
        onOpenChange={(next) => {
          if (deleting) return;
          setOpen(next);
          if (!next) {
            setConfirmation("");
            setDeleteError(null);
            setLoadError(null);
            setSummary(null);
          }
        }}
      >
        <AlertDialogTrigger asChild>
          <Button variant="destructive">
            <RiDeleteBin6Line className="mr-2 size-4" aria-hidden />
            Delete my account
          </Button>
        </AlertDialogTrigger>

        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account for good?</AlertDialogTitle>
            <AlertDialogDescription>
              This erases your account and everything recorded against it. It
              can&apos;t be undone, and we can&apos;t restore it for you later.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {loadError ? (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-lg bg-destructive-tint px-4 py-3 text-sm text-destructive-tint-foreground"
            >
              <RiAlertLine className="mt-0.5 size-4 shrink-0" aria-hidden />
              {loadError}
            </p>
          ) : !summary ? (
            <div className="space-y-2" aria-busy="true">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : blocker ? (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-lg bg-warning-tint px-4 py-3 text-sm text-warning-tint-foreground"
            >
              <RiInformationLine className="mt-0.5 size-4 shrink-0" aria-hidden />
              {blocker}
            </p>
          ) : (
            <div className="space-y-4">
              <ErasureList summary={summary} />

              <div className="space-y-2">
                <Label htmlFor="self-delete-confirmation">
                  Type{" "}
                  <span className="font-mono font-semibold break-all">
                    {summary.email}
                  </span>{" "}
                  to confirm
                </Label>
                <Input
                  id="self-delete-confirmation"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  disabled={deleting}
                />
              </div>

              {deleteError ? (
                <p
                  role="alert"
                  className="flex items-start gap-2 rounded-lg bg-destructive-tint px-4 py-3 text-sm text-destructive-tint-foreground"
                >
                  <RiAlertLine className="mt-0.5 size-4 shrink-0" aria-hidden />
                  {deleteError}
                </p>
              ) : null}
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>
              {blocker ? "Close" : "Keep my account"}
            </AlertDialogCancel>
            {!blocker && !loadError && (
              <AlertDialogAction
                onClick={(e) => {
                  // Keep the dialog open while the delete runs so the spinner
                  // and any error land somewhere they're still looking.
                  e.preventDefault();
                  void handleConfirm();
                }}
                disabled={!canDelete || deleting}
                variant="destructive"
              >
                {deleting ? (
                  <>
                    <RiLoader4Line
                      className="mr-2 size-4 animate-spin"
                      aria-hidden
                    />
                    Deleting...
                  </>
                ) : (
                  <>
                    <RiDeleteBin6Line className="mr-2 size-4" aria-hidden />
                    Delete permanently
                  </>
                )}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** What this deletion destroys, counted from the database. */
function ErasureList({ summary }: { summary: OwnAccountDeletionSummary }) {
  const { erases } = summary;
  const rows: { label: string; count: number }[] = [
    { label: "Shift signups", count: erases.shiftSignups },
    { label: "Shifts attended", count: erases.attendedShifts },
    { label: "Training registrations", count: erases.trainingAttendances },
    { label: "Uploaded documents", count: erases.documents },
    { label: "Signed agreements", count: erases.signedAgreements },
  ].filter((row) => row.count > 0);

  const authoredTotal =
    summary.authored.shifts +
    summary.authored.trainingSessions +
    summary.authored.announcements;

  return (
    <div className="space-y-3">
      <div className="rounded-lg bg-destructive-tint px-4 py-3 text-destructive-tint-foreground">
        <p className="eyebrow text-[0.68rem]">Erased with you</p>
        {rows.length === 0 ? (
          <p className="mt-2 text-sm">
            Your sign-in and profile only - nothing else is recorded against
            this account.
          </p>
        ) : (
          <dl className="mt-2 space-y-1 text-sm">
            {rows.map((row) => (
              <div
                key={row.label}
                className="flex items-baseline justify-between gap-4"
              >
                <dt>{row.label}</dt>
                <dd className="tnum font-semibold">{row.count}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      {/* Kept, not erased - and worth saying so, because "my pānui vanish" is
          the fear this otherwise leaves someone with. */}
      {authoredTotal > 0 ? (
        <p className="text-sm leading-relaxed text-muted-foreground">
          The shifts, training sessions and pānui you created for the kitchen
          stay on record - they simply stop showing your name.
        </p>
      ) : null}
    </div>
  );
}
