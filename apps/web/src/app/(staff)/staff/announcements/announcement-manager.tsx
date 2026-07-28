"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileDropzone } from "@/components/file-dropzone";
import { FileRow } from "@/components/file-row";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RiAddLine,
  RiAttachment2,
  RiCalendarLine,
  RiCloseLine,
  RiDeleteBinLine,
  RiEditLine,
  RiEyeOffLine,
  RiLoader4Line,
  RiMoreLine,
  RiSendPlaneLine,
  RiUserLine,
} from "@remixicon/react";
import { SectionHeader } from "@/components/brand/section-header";
import { Illustration } from "@/components/brand/illustration";
import { toast } from "sonner";
import { AnnouncementAttachments } from "@/components/announcement-attachments";
import {
  formatFileSize,
  MAX_UPLOAD_BYTES,
  UPLOAD_ACCEPT_ATTR,
} from "@/lib/uploads";
import {
  createAnnouncement,
  deleteAnnouncementAttachment,
  uploadAnnouncementAttachment,
  updateAnnouncement,
  publishAnnouncement,
  unpublishAnnouncement,
  deleteAnnouncement,
  getStaffAnnouncements,
  type AnnouncementAttachmentSummary,
  type StaffAnnouncement,
} from "@/lib/announcement-actions";
import {
  ANNOUNCEMENT_BODY_MAX,
  ANNOUNCEMENT_TITLE_MAX,
  audienceIncludesVolunteers,
  MAX_ANNOUNCEMENT_ATTACHMENTS,
  type AnnouncementAudience,
} from "@/lib/announcement-schema";

const AUDIENCE_LABELS: Record<AnnouncementAudience, string> = {
  ALL: "Everyone",
  VOLUNTEERS: "Volunteers",
  COORDINATORS: "Coordinators",
};

const AUDIENCE_VARIANTS: Record<AnnouncementAudience, "info" | "neutral"> = {
  ALL: "info",
  VOLUNTEERS: "neutral",
  COORDINATORS: "neutral",
};

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-NZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

interface AnnouncementManagerProps {
  initialAnnouncements: StaffAnnouncement[];
}

export function AnnouncementManager({
  initialAnnouncements,
}: AnnouncementManagerProps) {
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const [, startTransition] = useTransition();

  // Create/edit dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<StaffAnnouncement | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<AnnouncementAudience>("ALL");
  const [dialogError, setDialogError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Files chosen but not yet uploaded. A new pānui has no id to hang them off
  // until it's saved, so they queue here and upload straight after the create.
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [removingId, setRemovingId] = useState<string | null>(null);
  // Removing an attachment deletes the stored file for good, so it's confirmed
  // the same way document and training-type deletions are.
  const [removeTarget, setRemoveTarget] =
    useState<AnnouncementAttachmentSummary | null>(null);

  const existingAttachments = editTarget?.attachments ?? [];
  const attachmentCount = existingAttachments.length + pendingFiles.length;
  const canAttachMore = attachmentCount < MAX_ANNOUNCEMENT_ATTACHMENTS;

  function handleFilesChosen(accepted: File[]) {
    setPendingFiles((current) => [...current, ...accepted]);
  }

  function removePendingFile(index: number) {
    setPendingFiles((current) => current.filter((_, i) => i !== index));
  }

  async function handleRemoveAttachment(attachment: AnnouncementAttachmentSummary) {
    setRemoveTarget(null);
    setRemovingId(attachment.id);
    const result = await deleteAnnouncementAttachment(attachment.id);
    setRemovingId(null);

    if (result.error) {
      toast.error(result.error);
      return;
    }
    // Keep the open dialog honest about what's still attached.
    setEditTarget((current) =>
      current
        ? {
            ...current,
            attachments: current.attachments.filter(
              (a) => a.id !== attachment.id
            ),
          }
        : current
    );
    toast.success(`"${attachment.fileName}" removed.`);
    refresh();
  }

  /**
   * Uploads the queued files against a saved pānui, returning the ones that
   * didn't make it. Each failure is reported by name rather than failing the
   * save — the pānui itself is already stored — and only the failures are
   * handed back, so a retry can't upload the same file twice.
   */
  async function uploadPendingFiles(announcementId: string): Promise<File[]> {
    const failed: File[] = [];
    for (const file of pendingFiles) {
      const formData = new FormData();
      formData.set("file", file);
      try {
        const result = await uploadAnnouncementAttachment(
          announcementId,
          formData
        );
        if (result.error) {
          failed.push(file);
          toast.error(`${file.name}: ${result.error}`);
        }
      } catch (err) {
        failed.push(file);
        console.error("Attachment upload failed:", err);
        toast.error(`${file.name} couldn't be attached.`);
      }
    }
    return failed;
  }

  // Confirm dialogs
  const [publishTarget, setPublishTarget] = useState<StaffAnnouncement | null>(
    null
  );
  const [deleteTarget, setDeleteTarget] = useState<StaffAnnouncement | null>(
    null
  );

  function refresh() {
    startTransition(async () => {
      const refreshed = await getStaffAnnouncements();
      setAnnouncements(refreshed);
    });
  }

  function openCreate() {
    setEditTarget(null);
    setTitle("");
    setBody("");
    setAudience("ALL");
    setDialogError("");
    setPendingFiles([]);
    setDialogOpen(true);
  }

  function openEdit(announcement: StaffAnnouncement) {
    setEditTarget(announcement);
    setTitle(announcement.title);
    setBody(announcement.body);
    setAudience(announcement.audience);
    setDialogError("");
    setPendingFiles([]);
    setDialogOpen(true);
  }

  async function handleSave(publish: boolean) {
    setIsSaving(true);
    setDialogError("");

    // Kept as separate branches so the created id is actually in scope — only
    // createAnnouncement returns one.
    let announcementId: string | undefined;
    if (editTarget) {
      const result = await updateAnnouncement(editTarget.id, {
        title,
        body,
        audience,
      });
      if (result.error) {
        setDialogError(result.error);
        setIsSaving(false);
        return;
      }
      announcementId = editTarget.id;
    } else {
      const result = await createAnnouncement({
        title,
        body,
        audience,
        publish,
      });
      if (result.error) {
        setDialogError(result.error);
        setIsSaving(false);
        return;
      }
      announcementId = result.id;
    }
    const failed =
      pendingFiles.length > 0 && announcementId
        ? await uploadPendingFiles(announcementId)
        : [];

    toast.success(
      editTarget
        ? "Pānui updated."
        : publish
          ? "Pānui published — it's live now."
          : "Draft saved."
    );

    setIsSaving(false);

    // On an edit, saving again is idempotent, so failed files stay queued for a
    // retry. On a create it isn't — saving again would make a second pānui — so
    // the dialog closes and the files are added by editing the saved one.
    if (failed.length > 0 && editTarget) {
      setPendingFiles(failed);
      setDialogError("Some files couldn't be attached — try those again.");
      refresh();
      return;
    }

    if (failed.length > 0) {
      toast.error(
        "The pānui was saved, but some files weren't attached. Edit it to try again."
      );
    }

    setPendingFiles([]);
    setDialogOpen(false);
    refresh();
  }

  async function handlePublish(announcement: StaffAnnouncement) {
    const result = await publishAnnouncement(announcement.id);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(`"${announcement.title}" is live.`);
    refresh();
  }

  async function handleUnpublish(announcement: StaffAnnouncement) {
    const result = await unpublishAnnouncement(announcement.id);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(`"${announcement.title}" moved back to drafts.`);
    refresh();
  }

  async function handleDelete(announcement: StaffAnnouncement) {
    const result = await deleteAnnouncement(announcement.id);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(`"${announcement.title}" deleted.`);
    refresh();
  }

  const drafts = announcements.filter((a) => a.sentAt === null);
  const published = announcements.filter((a) => a.sentAt !== null);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <RiAddLine className="size-4" />
          New announcement
        </Button>
      </div>

      {announcements.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <Illustration name="korero" size={96} />
            <div>
              <p className="font-serif text-lg font-medium tracking-tight">
                No pānui yet
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Write your first pānui to share news with the whānau.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {drafts.length > 0 && (
            <section className="space-y-4">
              <SectionHeader
                eyebrow="Hukihuki"
                title={`Drafts (${drafts.length})`}
              />
              <Card>
                <ul className="divide-y divide-border">
                  {drafts.map((a) => (
                    <AnnouncementRow
                      key={a.id}
                      announcement={a}
                      onEdit={() => openEdit(a)}
                      onPublish={() => setPublishTarget(a)}
                      onUnpublish={() => handleUnpublish(a)}
                      onDelete={() => setDeleteTarget(a)}
                    />
                  ))}
                </ul>
              </Card>
            </section>
          )}

          {published.length > 0 && (
            <section className="space-y-4">
              <SectionHeader
                divider={drafts.length > 0}
                eyebrow="Kua tukuna"
                title={`Published (${published.length})`}
              />
              <Card>
                <ul className="divide-y divide-border">
                  {published.map((a) => (
                    <AnnouncementRow
                      key={a.id}
                      announcement={a}
                      onEdit={() => openEdit(a)}
                      onPublish={() => setPublishTarget(a)}
                      onUnpublish={() => handleUnpublish(a)}
                      onDelete={() => setDeleteTarget(a)}
                    />
                  ))}
                </ul>
              </Card>
            </section>
          )}
        </>
      )}

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editTarget ? "Edit announcement" : "New announcement"}
            </DialogTitle>
            <DialogDescription>
              {editTarget
                ? "Update this pānui. Edits to a published announcement go live straight away."
                : "Write a pānui for the team. Save it as a draft or publish it right away."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="announcement-title">Title</Label>
              <Input
                id="announcement-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={ANNOUNCEMENT_TITLE_MAX}
                placeholder="e.g. Kitchen closed on Matariki"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="announcement-body">Message</Label>
              <Textarea
                id="announcement-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={ANNOUNCEMENT_BODY_MAX}
                rows={6}
                placeholder="What would you like to share with the whānau?"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="announcement-audience">Who is this for?</Label>
              <Select
                value={audience}
                onValueChange={(v) => setAudience(v as AnnouncementAudience)}
              >
                <SelectTrigger id="announcement-audience" className="w-full">
                  <SelectValue placeholder="Choose an audience" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Everyone</SelectItem>
                  <SelectItem value="VOLUNTEERS">Volunteers</SelectItem>
                  <SelectItem value="COORDINATORS">Coordinators</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <Label htmlFor="announcement-files">
                  Attachments (optional)
                </Label>
                <span className="text-xs text-muted-foreground">
                  {attachmentCount}/{MAX_ANNOUNCEMENT_ATTACHMENTS}
                </span>
              </div>

              {existingAttachments.length > 0 && (
                <AnnouncementAttachments
                  attachments={existingAttachments}
                  onRemove={setRemoveTarget}
                  removingId={removingId}
                />
              )}

              {pendingFiles.length > 0 && (
                <ul className="space-y-1.5">
                  {pendingFiles.map((file, index) => (
                    <FileRow
                      key={`${file.name}-${index}`}
                      fileName={file.name}
                      contentType={file.type}
                      meta={`${formatFileSize(file.size)} · attaches when you save`}
                      actions={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => removePendingFile(index)}
                          disabled={isSaving}
                          aria-label={`Remove ${file.name}`}
                        >
                          <RiCloseLine className="size-3.5" />
                        </Button>
                      }
                    />
                  ))}
                </ul>
              )}

              <FileDropzone
                id="announcement-files"
                multiple
                accept={UPLOAD_ACCEPT_ATTR}
                disabled={isSaving || !canAttachMore}
                maxFiles={MAX_ANNOUNCEMENT_ATTACHMENTS - attachmentCount}
                maxFilesMessage={`A pānui can carry ${MAX_ANNOUNCEMENT_ATTACHMENTS} files at most.`}
                hint={
                  canAttachMore
                    ? `PDF, Word, or image — up to ${formatFileSize(MAX_UPLOAD_BYTES)} each`
                    : "Remove a file before adding another."
                }
                onFilesAccepted={handleFilesChosen}
              />

            </div>

            {dialogError && (
              <p className="text-sm text-destructive">{dialogError}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            {editTarget ? (
              <Button onClick={() => handleSave(false)} disabled={isSaving}>
                {isSaving && (
                  <RiLoader4Line className="mr-2 size-4 animate-spin" />
                )}
                Save changes
              </Button>
            ) : (
              <>
                <Button
                  variant="secondary"
                  onClick={() => handleSave(false)}
                  disabled={isSaving}
                >
                  Save draft
                </Button>
                <Button onClick={() => handleSave(true)} disabled={isSaving}>
                  {isSaving && (
                    <RiLoader4Line className="mr-2 size-4 animate-spin" />
                  )}
                  <RiSendPlaneLine className="size-4" />
                  Publish now
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Publish confirm */}
      <AlertDialog
        open={publishTarget !== null}
        onOpenChange={(open) => !open && setPublishTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish this pānui?</AlertDialogTitle>
            <AlertDialogDescription>
              {publishTarget && audienceIncludesVolunteers(publishTarget.audience)
                ? `"${publishTarget.title}" will appear in the news feed, and volunteers will get a notification.`
                : `"${publishTarget?.title}" will go live for ${publishTarget ? AUDIENCE_LABELS[publishTarget.audience].toLowerCase() : "its audience"}.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (publishTarget) handlePublish(publishTarget);
                setPublishTarget(null);
              }}
            >
              Publish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove-attachment confirm */}
      <AlertDialog
        open={removeTarget !== null}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this file?</AlertDialogTitle>
            <AlertDialogDescription>
              {`"${removeTarget?.fileName}" will be deleted from the pānui and from storage. This can't be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (removeTarget) handleRemoveAttachment(removeTarget);
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirm */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this pānui?</AlertDialogTitle>
            <AlertDialogDescription>
              {`"${deleteTarget?.title}" will be removed for everyone, including the volunteer news feed. This can't be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (deleteTarget) handleDelete(deleteTarget);
                setDeleteTarget(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AnnouncementRow({
  announcement,
  onEdit,
  onPublish,
  onUnpublish,
  onDelete,
}: {
  announcement: StaffAnnouncement;
  onEdit: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
  onDelete: () => void;
}) {
  const isDraft = announcement.sentAt === null;

  return (
    <li className="flex items-start gap-3 px-5 py-3.5">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="min-w-0 truncate font-serif text-base font-medium tracking-tight">
            {announcement.title}
          </h3>
          <Badge variant={AUDIENCE_VARIANTS[announcement.audience]}>
            {AUDIENCE_LABELS[announcement.audience]}
          </Badge>
        </div>
        <p className="line-clamp-2 text-sm text-muted-foreground">
          {announcement.body}
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <RiCalendarLine className="size-3.5" aria-hidden />
            {announcement.sentAt
              ? `Published ${formatDate(announcement.sentAt)}`
              : `Created ${formatDate(announcement.createdAt)}`}
          </span>
          {announcement.authorName && (
            <span className="flex items-center gap-1.5">
              <RiUserLine className="size-3.5" aria-hidden />
              {announcement.authorName}
            </span>
          )}
          {announcement.attachments.length > 0 && (
            <span className="flex items-center gap-1.5">
              <RiAttachment2 className="size-3.5" aria-hidden />
              {announcement.attachments.length}{" "}
              {announcement.attachments.length === 1 ? "file" : "files"}
            </span>
          )}
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Announcement actions">
            <RiMoreLine className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit}>
            <RiEditLine className="mr-2 size-4" />
            Edit
          </DropdownMenuItem>
          {isDraft ? (
            <DropdownMenuItem onClick={onPublish}>
              <RiSendPlaneLine className="mr-2 size-4" />
              Publish
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={onUnpublish}>
              <RiEyeOffLine className="mr-2 size-4" />
              Unpublish
            </DropdownMenuItem>
          )}
          <DropdownMenuItem variant="destructive" onClick={onDelete}>
            <RiDeleteBinLine className="mr-2 size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}
