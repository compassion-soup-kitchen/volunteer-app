"use client";

import { useEffect, useState } from "react";
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
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  deleteUser,
  getUserDeletionSummary,
  type UserDeletionSummary,
} from "@/lib/staff-actions";
import { matchesDeletionConfirmation } from "@/lib/user-deletion";

type Target = { userId: string; name: string | null; email: string };

interface DeleteUserDialogProps {
  /** The person to delete, or null when the dialog is closed. */
  target: Target | null;
  onClose: () => void;
  /** Called after a successful deletion, with a name for the toast copy. */
  onDeleted: (name: string) => void;
  onError: (message: string) => void;
}

// Both pieces of dialog state are stamped with the user they belong to, and
// read back only when that stamp still matches the open target. That resets
// them on every new target without a synchronous setState in an effect - which
// would cascade a re-render - and without remounting the dialog, which would
// cut its close animation short.
type LoadedSummary = {
  userId: string;
  summary?: UserDeletionSummary;
  error?: string;
};

/**
 * Confirms permanent deletion of an account. Unlike archiving there's no way
 * back, so the dialog spells out exactly what disappears - counted live from
 * the database, not guessed - and asks the admin to type the person's email
 * before the button unlocks. Accounts this admin can't delete from here
 * (their own, or the last admin) show the reason instead of a confirmation
 * field.
 */
export function DeleteUserDialog({
  target,
  onClose,
  onDeleted,
  onError,
}: DeleteUserDialogProps) {
  const [loaded, setLoaded] = useState<LoadedSummary | null>(null);
  const [typed, setTyped] = useState<{ userId: string; value: string } | null>(
    null
  );
  const [deleting, setDeleting] = useState(false);

  const userId = target?.userId ?? null;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    getUserDeletionSummary(userId)
      .then((result) => {
        if (cancelled) return;
        setLoaded(
          "error" in result
            ? { userId, error: result.error }
            : { userId, summary: result }
        );
      })
      .catch(() => {
        if (cancelled) return;
        setLoaded({
          userId,
          error: "Couldn't check this account. Please try again.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const forTarget = loaded?.userId === userId ? loaded : null;
  const summary = forTarget?.summary ?? null;
  const loadError = forTarget?.error ?? null;
  const confirmation = typed?.userId === userId ? typed.value : "";

  const name = target?.name || "this person";
  const blocker = summary?.blocker ?? null;
  const canDelete =
    summary !== null &&
    blocker === null &&
    matchesDeletionConfirmation(confirmation, summary.email);

  async function handleConfirm() {
    if (!target || !canDelete) return;
    setDeleting(true);
    const result = await deleteUser(target.userId, confirmation);
    setDeleting(false);
    if (result.error) {
      onError(result.error);
      return;
    }
    onDeleted(target.name || "That account");
  }

  return (
    <AlertDialog
      open={target !== null}
      onOpenChange={(open) => {
        if (!open && !deleting) onClose();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {name} for good?</AlertDialogTitle>
          <AlertDialogDescription>
            This erases their account and everything recorded against it. It
            can&apos;t be undone, and their hours leave reporting with them. If
            they might come back, archive them instead.
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
              <Label htmlFor="delete-confirmation">
                Type{" "}
                <span className="font-mono font-semibold break-all">
                  {summary.email}
                </span>{" "}
                to confirm
              </Label>
              <Input
                id="delete-confirmation"
                value={confirmation}
                onChange={(e) =>
                  setTyped({ userId: summary.userId, value: e.target.value })
                }
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                disabled={deleting}
              />
            </div>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>
            {blocker ? "Close" : "Cancel"}
          </AlertDialogCancel>
          {!blocker && !loadError && (
            <AlertDialogAction
              onClick={(e) => {
                // Keep the dialog open while the delete runs so the spinner and
                // any error land somewhere the admin is still looking.
                e.preventDefault();
                void handleConfirm();
              }}
              disabled={!canDelete || deleting}
              variant="destructive"
            >
              {deleting ? (
                <>
                  <RiLoader4Line className="mr-2 size-4 animate-spin" aria-hidden />
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
  );
}

/** What this deletion destroys, counted from the database. */
function ErasureList({ summary }: { summary: UserDeletionSummary }) {
  const { erases } = summary;
  const rows: { label: string; count: number }[] = [
    { label: "Shift signups", count: erases.shiftSignups },
    { label: "Shifts attended", count: erases.attendedShifts },
    { label: "Training registrations", count: erases.trainingAttendances },
    { label: "Uploaded documents", count: erases.documents },
    { label: "Signed agreements", count: erases.signedAgreements },
  ].filter((row) => row.count > 0);

  return (
    <div className="rounded-lg bg-destructive-tint px-4 py-3 text-destructive-tint-foreground">
      <p className="eyebrow text-[0.68rem]">Erased with them</p>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm">
          Their sign-in and profile only - nothing else is recorded against this
          account.
        </p>
      ) : (
        <dl className="mt-2 space-y-1 text-sm">
          {rows.map((row) => (
            <div key={row.label} className="flex items-baseline justify-between gap-4">
              <dt>{row.label}</dt>
              <dd className="tnum font-semibold">{row.count}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
