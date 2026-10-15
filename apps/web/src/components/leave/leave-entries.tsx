"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RiLoader4Line, RiSuitcaseLine } from "@remixicon/react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { IconChip } from "@/components/brand/icon-chip";
import { StatusBadge } from "@/components/brand/status-badge";
import {
  endLeaveNow,
  removeLeave,
  type LeaveRecord,
  type StaffLeaveRecord,
} from "@/lib/leave-actions";
import type { DateOnly } from "@/lib/date-only";
import {
  describeLeaveStatus,
  formatLeaveLength,
  formatLeaveRange,
  leaveStage,
  type LeaveStage,
} from "@/lib/volunteer-leave";
import { cn } from "@/lib/utils";
import { LeaveForm } from "./leave-form";

const STAGE_STATUS: Record<LeaveStage, string> = {
  current: "LEAVE_CURRENT",
  upcoming: "LEAVE_UPCOMING",
  past: "LEAVE_PAST",
};

const STAGE_TONE: Record<LeaveStage, "warning" | "info" | "neutral"> = {
  current: "warning",
  upcoming: "info",
  past: "neutral",
};

type Entry = LeaveRecord | StaffLeaveRecord;

function isStaffRecord(entry: Entry): entry is StaffLeaveRecord {
  return "volunteer" in entry;
}

type Confirm = { kind: "end" | "remove"; entry: Entry } | null;

interface LeaveEntriesProps {
  entries: Entry[];
  audience: "volunteer" | "staff";
  today: DateOnly;
  /** Name each row's volunteer - the staff board lists everyone at once. */
  showVolunteer?: boolean;
  /** The volunteer's name, for staff wording on a single record. */
  volunteerName?: string;
  /**
   * Which rows carry a stage badge. A list already grouped by stage under its
   * own heading doesn't need one repeating it; a mixed list does.
   */
  stageBadge?: "all" | "current" | "none";
}

/**
 * Stretches of leave as a hairline list, each with what can still be done to
 * it. The actions follow the rules in volunteer-leave.ts: a volunteer edits
 * or cancels leave ahead, comes back early from leave under way, and leaves
 * the past alone; staff can also remove any of it to fix a mistake.
 */
export function LeaveEntries({
  entries,
  audience,
  today,
  showVolunteer = false,
  volunteerName,
  stageBadge = "all",
}: LeaveEntriesProps) {
  const router = useRouter();
  const [editing, setEditing] = useState<Entry | null>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [isPending, startTransition] = useTransition();
  const isStaff = audience === "staff";

  function nameOf(entry: Entry): string | undefined {
    return isStaffRecord(entry) ? entry.volunteer.name.split(" ")[0] : volunteerName;
  }

  function runConfirm() {
    if (!confirm) return;
    const { kind, entry } = confirm;
    startTransition(async () => {
      const result = kind === "end" ? await endLeaveNow(entry.id) : await removeLeave(entry.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      const back = result.restoredShifts ?? 0;
      const seats = back > 0 ? ` Back on ${back} regular ${back === 1 ? "shift" : "shifts"}.` : "";
      toast.success(
        (kind === "end"
          ? isStaff
            ? "Marked as back."
            : "Welcome back!"
          : isStaff
            ? "Leave removed."
            : "Leave cancelled.") + seats
      );
      setConfirm(null);
      router.refresh();
    });
  }

  return (
    <>
      <ul className="divide-y divide-border">
        {entries.map((entry) => {
          const stage = leaveStage(entry, today);
          const canEdit = stage !== "past";
          const canEnd = stage === "current";
          const canRemove = isStaff || stage === "upcoming";
          const loggedByStaff = entry.loggedBy && !entry.loggedBy.isSelf;

          return (
            <li key={entry.id} className="flex items-start gap-3 px-5 py-3.5">
              <IconChip size="sm" tone={STAGE_TONE[stage]} className="mt-0.5">
                <RiSuitcaseLine />
              </IconChip>
              {/* Text and actions share a wrapping row, so in a narrow column
                  the actions drop under the text rather than under the icon. */}
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1.5">
                <div className="min-w-0 flex-1 basis-48">
                  {showVolunteer && isStaffRecord(entry) && (
                    <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold">
                      <Link
                        href={`/staff/volunteers/${entry.volunteer.userId}`}
                        className="hover:text-primary hover:underline"
                      >
                        {entry.volunteer.name}
                      </Link>
                      {entry.volunteer.isOffline && <Badge variant="neutral">Offline</Badge>}
                    </p>
                  )}
                  <p
                    className={
                      showVolunteer
                        ? "tnum text-sm text-foreground"
                        : "tnum text-sm font-semibold"
                    }
                  >
                    {formatLeaveRange(entry, today)}
                    <span className="font-normal text-muted-foreground">
                      {" · "}
                      {formatLeaveLength(entry)}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {[
                      describeLeaveStatus(entry, today),
                      entry.reason,
                      loggedByStaff ? `Logged by ${entry.loggedBy!.name}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                {/* Pulled out by the ghost buttons' padding so their labels line
                    up with the text edge, whichever side they land on. On the
                    board, where each row names someone, they always sit under
                    the text - a short row would otherwise put them beside it
                    and break the column's rhythm. */}
                <div
                  className={cn(
                    "-mx-2.5 flex shrink-0 items-center gap-1",
                    showVolunteer && "basis-full"
                  )}
                >
                  {(stageBadge === "all" || (stageBadge === "current" && stage === "current")) && (
                    <StatusBadge status={STAGE_STATUS[stage]} className="mx-2.5" />
                  )}
                  {canEdit && (
                    <Button size="sm" variant="ghost" onClick={() => setEditing(entry)}>
                      {stage === "current" ? "Change" : "Edit"}
                    </Button>
                  )}
                  {canEnd && (
                    <Button size="sm" variant="ghost" onClick={() => setConfirm({ kind: "end", entry })}>
                      {isStaff ? "Mark back" : "I'm back"}
                    </Button>
                  )}
                  {canRemove && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setConfirm({ kind: "remove", entry })}
                    >
                      {isStaff ? "Remove" : "Cancel"}
                    </Button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl tracking-tight">
              {isStaff && editing && nameOf(editing)
                ? `Change ${nameOf(editing)}'s leave`
                : "Change your leave"}
            </DialogTitle>
            <DialogDescription>
              Shifts on any new days away come off the roster when you save.
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <LeaveForm
              key={editing.id}
              audience={audience}
              today={today}
              leave={editing}
              volunteerName={nameOf(editing)}
              onCancel={() => setEditing(null)}
              onSaved={() => {
                setEditing(null);
                router.refresh();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={confirm !== null}
        onOpenChange={(open) => {
          if (!open && !isPending) setConfirm(null);
        }}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-xl tracking-tight">
              {confirmTitle(confirm, isStaff, confirm ? nameOf(confirm.entry) : undefined)}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.kind === "end"
                ? `The leave ends yesterday, and ${isStaff ? "they go" : "you go"} back on any repeating shifts that still have room. Other shifts are open to sign up for again.`
                : leaveStage(confirm?.entry ?? { startsOn: today, endsOn: today }, today) === "past"
                  ? "It comes off the record. Nothing on the roster changes."
                  : `${formatLeaveRange(confirm?.entry ?? { startsOn: today, endsOn: today }, today)} comes off the record, and ${isStaff ? "they go" : "you go"} back on any repeating shifts that still have room.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>
              {confirm?.kind === "end" ? "Not yet" : "Keep it"}
            </AlertDialogCancel>
            <Button
              variant={confirm?.kind === "end" ? "default" : "destructive"}
              onClick={runConfirm}
              disabled={isPending}
            >
              {isPending && <RiLoader4Line className="size-4 animate-spin" aria-hidden />}
              {confirm?.kind === "end"
                ? isStaff
                  ? "Mark back"
                  : "I'm back"
                : isStaff
                  ? "Remove leave"
                  : "Cancel leave"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function confirmTitle(confirm: Confirm, isStaff: boolean, name: string | undefined): string {
  if (!confirm) return "";
  if (confirm.kind === "end") {
    return isStaff ? `Mark ${name ?? "them"} as back today?` : "Back early? Nau mai anō!";
  }
  return isStaff ? `Remove ${name ? `${name}'s` : "this"} leave?` : "Cancel this leave?";
}
