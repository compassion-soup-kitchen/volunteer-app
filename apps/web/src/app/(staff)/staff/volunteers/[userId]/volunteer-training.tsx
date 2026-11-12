"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  RiAddLine,
  RiAttachment2,
  RiDeleteBinLine,
  RiGraduationCapLine,
  RiLoader4Line,
} from "@remixicon/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardAction, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import {
  Field,
  FieldControl,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { BleedList } from "@/components/brand/detail-list";
import { EmptyState } from "@/components/brand/empty-state";
import { IconChip } from "@/components/brand/icon-chip";
import { StatusBadge } from "@/components/brand/status-badge";
import { DatePicker } from "@/components/date-picker";
import { FileDropzone } from "@/components/file-dropzone";
import { useDocumentDownload } from "@/components/documents/use-document-download";
import {
  formatDateOnly,
  toDateOnly,
  toPickerDate,
  parseDateOnly,
  type DateOnly,
} from "@/lib/date-only";
import { TRAINING_RECORD_NOTE_MAX } from "@/lib/training-records";
import type { TrainingHistoryItem } from "@/lib/data/volunteer-training";
import type { TrainingTypeOption } from "@/lib/training-type-actions";
import { formatFileSize, MAX_UPLOAD_BYTES, UPLOAD_ACCEPT_ATTR } from "@/lib/uploads";
import {
  recordVolunteerTraining,
  removeTrainingRecord,
} from "@/lib/volunteer-record-actions";
import { ChosenFile } from "./chosen-file";

/**
 * Everything this person has been trained in: the sessions they were on, and
 * training signed off on paper that staff recorded here, each with its scanned
 * sheet. Answers "had they done the dinner training?" at a glance.
 */
export function VolunteerTraining({
  userId,
  firstName,
  training,
  trainingTypes,
  today,
}: {
  userId: string;
  firstName: string;
  training: TrainingHistoryItem[];
  /** Types still offered - what a new record can be filed under. */
  trainingTypes: TrainingTypeOption[];
  today: DateOnly;
}) {
  const router = useRouter();
  const { downloading, download } = useDocumentDownload();

  async function handleRemove(item: TrainingHistoryItem): Promise<boolean> {
    const result = await removeTrainingRecord(userId, item.id);
    if (result.error) {
      toast.error(result.error);
      return false;
    }
    toast.success(`${item.title} removed from the record.`);
    router.refresh();
    return true;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2.5">
          <IconChip size="sm">
            <RiGraduationCapLine />
          </IconChip>
          <CardTitle>Whakangungu · Training</CardTitle>
        </div>
        <CardAction>
          <RecordTrainingDialog
            userId={userId}
            firstName={firstName}
            trainingTypes={trainingTypes}
            today={today}
          />
        </CardAction>
      </CardHeader>
      {training.length > 0 ? (
        <BleedList>
          {training.map((item) => {
            const record = item.record;
            const scan = record?.document ?? null;
            return (
              <li key={`${item.source}-${item.id}`} className="flex items-start gap-3 px-5 py-3">
                <IconChip size="sm" className="mt-0.5">
                  <RiGraduationCapLine />
                </IconChip>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateOnly(item.date, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                    {" · "}
                    {record
                      ? `Recorded${record.recordedByName ? ` by ${record.recordedByName}` : ""}`
                      : item.type.name}
                  </p>
                  {record?.note && (
                    <p className="mt-1 text-sm text-pretty text-foreground/80">
                      {record.note}
                    </p>
                  )}
                  {scan && (
                    <button
                      type="button"
                      onClick={() => download(scan.id, scan.fileName)}
                      disabled={downloading === scan.id}
                      className="mt-1 inline-flex max-w-full items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline disabled:opacity-60"
                    >
                      {downloading === scan.id ? (
                        <RiLoader4Line className="size-3.5 shrink-0 animate-spin" aria-hidden />
                      ) : (
                        <RiAttachment2 className="size-3.5 shrink-0" aria-hidden />
                      )}
                      <span className="sr-only">Download sign-off sheet </span>
                      <span className="truncate">{scan.fileName}</span>
                    </button>
                  )}
                </div>
                {record ? (
                  <div className="flex shrink-0 items-center gap-1">
                    <StatusBadge status="ATTENDED" label="Signed off" />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Remove ${item.title} from the record`}
                        >
                          <RiDeleteBinLine className="size-3.5 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove this training?</AlertDialogTitle>
                          <AlertDialogDescription>
                            {item.title} will come off {firstName}&apos;s record
                            {scan ? ", along with its scanned sign-off sheet" : ""}.
                            This can&apos;t be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Keep it</AlertDialogCancel>
                          <AlertDialogAction
                            variant="destructive"
                            onConfirm={() => handleRemove(item)}
                          >
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ) : (
                  <StatusBadge className="shrink-0" status={item.status} />
                )}
              </li>
            );
          })}
        </BleedList>
      ) : (
        <EmptyState
          bare
          size="compact"
          icon={<RiGraduationCapLine />}
          title="No training yet"
          description="Record training signed off on paper, with a scan of the sheet."
          className="border-t border-border"
        />
      )}
    </Card>
  );
}

function RecordTrainingDialog({
  userId,
  firstName,
  trainingTypes,
  today,
}: {
  userId: string;
  firstName: string;
  trainingTypes: TrainingTypeOption[];
  today: DateOnly;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typeId, setTypeId] = useState("");
  const [completedOn, setCompletedOn] = useState<DateOnly | null>(today);
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isPending, startTransition] = useTransition();

  // Starts afresh on opening, so the dialog doesn't flick back while it fades.
  function changeOpen(next: boolean) {
    if (isPending) return;
    setOpen(next);
    if (next) {
      setTypeId("");
      setCompletedOn(today);
      setNote("");
      setFile(null);
    }
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!typeId || !completedOn) return;
    const formData = new FormData();
    formData.set("typeId", typeId);
    formData.set("completedOn", completedOn);
    formData.set("note", note);
    if (file) formData.set("file", file);
    startTransition(async () => {
      try {
        const result = await recordVolunteerTraining(userId, formData);
        if (result.error) {
          toast.error(result.error);
          return;
        }
        const name = trainingTypes.find((t) => t.id === typeId)?.name ?? "Training";
        toast.success(`${name} recorded for ${firstName}.`);
        setOpen(false);
        router.refresh();
      } catch (err) {
        // A payload past the server's body limit never reaches the action.
        console.error("Record training failed:", err);
        toast.error("That didn't save. If you attached a large file, try a smaller one.");
      }
    });
  }

  const noTypes = trainingTypes.length === 0;

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <RiAddLine aria-hidden />
          Record training
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl tracking-tight">
            Record training for {firstName}
          </DialogTitle>
          <DialogDescription>
            For training signed off on paper. Attach the scanned sheet so the
            record and its sign-off sit together.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5" noValidate>
          <Field id="training-record-type">
            <div className="flex items-baseline justify-between gap-3">
              <FieldLabel>Training</FieldLabel>
              <Link
                href="/staff/training/types"
                className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Manage types
              </Link>
            </div>
            <Select value={typeId} onValueChange={setTypeId} disabled={isPending || noTypes}>
              <FieldControl>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose the training" />
                </SelectTrigger>
              </FieldControl>
              <SelectContent>
                {trainingTypes.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {noTypes && (
              <FieldDescription className="text-sm">
                No training types yet - add one under Manage types first.
              </FieldDescription>
            )}
          </Field>

          <Field id="training-record-date">
            <FieldLabel>Signed off on</FieldLabel>
            <FieldControl>
              <DatePicker
                value={completedOn ? toPickerDate(parseDateOnly(completedOn)) : undefined}
                onChange={(date) => setCompletedOn(date ? toDateOnly(date) : null)}
                placeholder="Choose a day"
                disabled={isPending}
                toDate={toPickerDate(parseDateOnly(today))}
              />
            </FieldControl>
          </Field>

          <Field id="training-record-note">
            <FieldLabel>Note (optional)</FieldLabel>
            <FieldControl>
              <Textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={TRAINING_RECORD_NOTE_MAX}
                rows={2}
                placeholder="e.g. Signed off by Amanda over three dinner shifts"
                disabled={isPending}
              />
            </FieldControl>
            <FieldDescription className="text-sm">
              Only the kitchen team sees this.
            </FieldDescription>
          </Field>

          <div className="space-y-2">
            <p className="text-sm font-medium">Sign-off sheet (optional)</p>
            <ChosenFile file={file} onClear={() => setFile(null)} disabled={isPending} />
            <FileDropzone
              id="training-record-file"
              accept={UPLOAD_ACCEPT_ATTR}
              disabled={isPending}
              hint={
                file
                  ? "Drop another to replace it"
                  : `A scan or photo - PDF or image, up to ${formatFileSize(MAX_UPLOAD_BYTES)}`
              }
              onFilesAccepted={([chosen]) => setFile(chosen)}
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending || !typeId || !completedOn}>
              {isPending && <RiLoader4Line className="animate-spin" aria-hidden />}
              {isPending ? "Saving…" : "Record training"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
