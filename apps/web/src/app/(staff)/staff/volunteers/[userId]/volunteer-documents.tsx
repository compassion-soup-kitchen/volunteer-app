"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  RiAttachment2,
  RiDeleteBinLine,
  RiDownloadLine,
  RiFileTextLine,
  RiLoader4Line,
} from "@remixicon/react";
import { toast } from "sonner";

import { Card, CardAction, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Field, FieldControl, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BleedList } from "@/components/brand/detail-list";
import { IconChip } from "@/components/brand/icon-chip";
import { EmptyState } from "@/components/brand/empty-state";
import { FileDropzone } from "@/components/file-dropzone";
import { FileRow } from "@/components/file-row";
import { useDocumentDownload } from "@/components/documents/use-document-download";
import { ChosenFile } from "./chosen-file";
import { documentTypeLabel } from "@/lib/document-labels";
import { formatTimestamp } from "@/lib/format";
import {
  VOLUNTEER_FILE_TYPES,
  type VolunteerFileType,
} from "@/lib/training-records";
import { formatFileSize, MAX_UPLOAD_BYTES, UPLOAD_ACCEPT_ATTR } from "@/lib/uploads";
import {
  attachVolunteerFile,
  removeVolunteerFile,
} from "@/lib/volunteer-record-actions";
import type { VolunteerDetailDocument } from "@/lib/staff-actions";

/**
 * The files held against one volunteer - their ID, MoJ and police vetting, the
 * scanned training sign-off sheets. Staff attach and remove them here; the
 * paper stays the source of truth and the scan is the copy everyone can find.
 */
export function VolunteerDocuments({
  userId,
  documents,
}: {
  userId: string;
  documents: VolunteerDetailDocument[];
}) {
  const router = useRouter();
  const { downloading, download } = useDocumentDownload();

  async function handleRemove(doc: VolunteerDetailDocument): Promise<boolean> {
    const result = await removeVolunteerFile(userId, doc.id);
    if (result.error) {
      toast.error(result.error);
      return false;
    }
    toast.success(`"${doc.fileName}" removed.`);
    router.refresh();
    return true;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2.5">
          <IconChip size="sm">
            <RiFileTextLine />
          </IconChip>
          <CardTitle>Documents</CardTitle>
        </div>
        <CardAction>
          <AttachFileDialog userId={userId} />
        </CardAction>
      </CardHeader>
      {documents.length > 0 ? (
        <BleedList>
          {documents.map((doc) => (
            <FileRow
              key={doc.id}
              variant="list"
              fileName={doc.fileName}
              meta={
                <>
                  {documentTypeLabel(doc.type)}
                  {" · "}
                  {formatTimestamp(doc.uploadedAt)}
                  {doc.uploadedByName && ` · ${doc.uploadedByName}`}
                </>
              }
              actions={
                <>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => download(doc.id, doc.fileName)}
                    disabled={downloading === doc.id}
                    aria-label={`Download ${doc.fileName}`}
                  >
                    {downloading === doc.id ? (
                      <RiLoader4Line className="size-3.5 animate-spin" />
                    ) : (
                      <RiDownloadLine className="size-3.5" />
                    )}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Remove ${doc.fileName}`}
                      >
                        <RiDeleteBinLine className="size-3.5 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove this file?</AlertDialogTitle>
                        <AlertDialogDescription>
                          &ldquo;{doc.fileName}&rdquo; will be deleted from
                          this record. Any training it was the sign-off for
                          stays recorded. This can&apos;t be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Keep it</AlertDialogCancel>
                        <AlertDialogAction
                          variant="destructive"
                          onConfirm={() => handleRemove(doc)}
                        >
                          Remove
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              }
            />
          ))}
        </BleedList>
      ) : (
        <EmptyState
          bare
          size="compact"
          icon={<RiFileTextLine />}
          title="No files held for this volunteer"
          description="Attach scanned vetting forms and training sign-off sheets here."
          className="border-t border-border"
        />
      )}
    </Card>
  );
}

function AttachFileDialog({ userId }: { userId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<VolunteerFileType>("TRAINING_RECORD");
  const [file, setFile] = useState<File | null>(null);
  const [isPending, startTransition] = useTransition();

  // Starts afresh on opening, so the dialog doesn't flick back while it fades.
  function changeOpen(next: boolean) {
    if (isPending) return;
    setOpen(next);
    if (next) {
      setType("TRAINING_RECORD");
      setFile(null);
    }
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return;
    const formData = new FormData();
    formData.set("type", type);
    formData.set("file", file);
    startTransition(async () => {
      try {
        const result = await attachVolunteerFile(userId, formData);
        if (result.error) {
          toast.error(result.error);
          return;
        }
        toast.success(`"${file.name}" attached.`);
        setOpen(false);
        router.refresh();
      } catch (err) {
        // A payload past the server's body limit never reaches the action.
        console.error("Attach file failed:", err);
        toast.error("The upload failed. If the file is large, try a smaller one.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <RiAttachment2 aria-hidden />
          Attach a file
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl tracking-tight">
            Attach a file
          </DialogTitle>
          <DialogDescription>
            A scan or photo of a signed form. Only the kitchen team can see it.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5" noValidate>
          <Field id="volunteer-file-type">
            <FieldLabel>What is it?</FieldLabel>
            <Select
              value={type}
              onValueChange={(value) => setType(value as VolunteerFileType)}
              disabled={isPending}
            >
              <FieldControl>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
              </FieldControl>
              <SelectContent>
                {VOLUNTEER_FILE_TYPES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {documentTypeLabel(value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <div className="space-y-2">
            <p className="text-sm font-medium">File</p>
            <ChosenFile file={file} onClear={() => setFile(null)} disabled={isPending} />
            <FileDropzone
              id="volunteer-file"
              accept={UPLOAD_ACCEPT_ATTR}
              disabled={isPending}
              hint={
                file
                  ? "Drop another to replace it"
                  : `PDF or image - up to ${formatFileSize(MAX_UPLOAD_BYTES)}`
              }
              onFilesAccepted={([chosen]) => setFile(chosen)}
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending || !file}>
              {isPending && <RiLoader4Line className="animate-spin" aria-hidden />}
              {isPending ? "Attaching…" : "Attach"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
