"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  RiCalendarLine,
  RiDeleteBinLine,
  RiEditLine,
  RiEyeOffLine,
  RiLoader4Line,
  RiMegaphoneLine,
  RiMoreLine,
  RiSendPlaneLine,
  RiUserLine,
} from "@remixicon/react";
import { toast } from "sonner";
import {
  createAnnouncement,
  updateAnnouncement,
  publishAnnouncement,
  unpublishAnnouncement,
  deleteAnnouncement,
  getStaffAnnouncements,
  type StaffAnnouncement,
} from "@/lib/announcement-actions";
import {
  ANNOUNCEMENT_BODY_MAX,
  ANNOUNCEMENT_TITLE_MAX,
  audienceIncludesVolunteers,
  type AnnouncementAudience,
} from "@/lib/announcement-schema";

const AUDIENCE_LABELS: Record<AnnouncementAudience, string> = {
  ALL: "Everyone",
  VOLUNTEERS: "Volunteers",
  COORDINATORS: "Coordinators",
};

const AUDIENCE_VARIANTS: Record<
  AnnouncementAudience,
  "info" | "default" | "amber"
> = {
  ALL: "info",
  VOLUNTEERS: "default",
  COORDINATORS: "amber",
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
    setDialogOpen(true);
  }

  function openEdit(announcement: StaffAnnouncement) {
    setEditTarget(announcement);
    setTitle(announcement.title);
    setBody(announcement.body);
    setAudience(announcement.audience);
    setDialogError("");
    setDialogOpen(true);
  }

  async function handleSave(publish: boolean) {
    setIsSaving(true);
    setDialogError("");

    const result = editTarget
      ? await updateAnnouncement(editTarget.id, { title, body, audience })
      : await createAnnouncement({ title, body, audience, publish });

    if (result.error) {
      setDialogError(result.error);
      setIsSaving(false);
      return;
    }

    toast.success(
      editTarget
        ? "Pānui updated."
        : publish
          ? "Pānui published — it's live now."
          : "Draft saved."
    );
    setDialogOpen(false);
    setIsSaving(false);
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
          <CardContent className="py-12 text-center">
            <RiMegaphoneLine className="mx-auto mb-3 size-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No announcements yet. Write your first pānui to share news with
              the whānau.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {drafts.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-foreground">
                Drafts ({drafts.length})
              </h2>
              {drafts.map((a) => (
                <AnnouncementCard
                  key={a.id}
                  announcement={a}
                  onEdit={() => openEdit(a)}
                  onPublish={() => setPublishTarget(a)}
                  onUnpublish={() => handleUnpublish(a)}
                  onDelete={() => setDeleteTarget(a)}
                />
              ))}
            </div>
          )}

          {published.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-foreground">
                Published ({published.length})
              </h2>
              {published.map((a) => (
                <AnnouncementCard
                  key={a.id}
                  announcement={a}
                  onEdit={() => openEdit(a)}
                  onPublish={() => setPublishTarget(a)}
                  onUnpublish={() => handleUnpublish(a)}
                  onDelete={() => setDeleteTarget(a)}
                />
              ))}
            </div>
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

function AnnouncementCard({
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
    <Card className={isDraft ? "border-dashed" : undefined}>
      <CardContent className="flex items-start justify-between gap-4 py-4">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-medium">{announcement.title}</h3>
            <Badge variant={isDraft ? "warning" : "success"}>
              {isDraft ? "Draft" : "Published"}
            </Badge>
            <Badge variant={AUDIENCE_VARIANTS[announcement.audience]}>
              {AUDIENCE_LABELS[announcement.audience]}
            </Badge>
          </div>
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {announcement.body}
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <RiCalendarLine className="size-3.5" />
              {announcement.sentAt
                ? `Published ${formatDate(announcement.sentAt)}`
                : `Created ${formatDate(announcement.createdAt)}`}
            </span>
            {announcement.authorName && (
              <span className="flex items-center gap-1.5">
                <RiUserLine className="size-3.5" />
                {announcement.authorName}
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
      </CardContent>
    </Card>
  );
}
