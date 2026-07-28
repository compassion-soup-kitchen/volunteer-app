"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  RiDeleteBinLine,
  RiDownloadLine,
  RiFileTextLine,
  RiImageLine,
  RiLoader4Line,
} from "@remixicon/react";

import { Button } from "@/components/ui/button";
import {
  getAnnouncementAttachmentUrl,
  type AnnouncementAttachmentSummary,
} from "@/lib/announcement-actions";
import { formatFileSize } from "@/lib/uploads";

/**
 * The files attached to a pānui, on both the staff editor and the volunteer
 * feed. Downloads go through a short-lived signed URL — the storage key never
 * reaches the browser.
 *
 * Passing `onRemove` puts it in editing mode and shows a delete control per row.
 */
export function AnnouncementAttachments({
  attachments,
  onRemove,
  removingId,
}: {
  attachments: AnnouncementAttachmentSummary[];
  onRemove?: (attachment: AnnouncementAttachmentSummary) => void;
  removingId?: string | null;
}) {
  const [downloading, setDownloading] = useState<string | null>(null);

  if (attachments.length === 0) return null;

  async function handleDownload(attachment: AnnouncementAttachmentSummary) {
    setDownloading(attachment.id);
    try {
      const url = await getAnnouncementAttachmentUrl(attachment.id);
      if (!url) {
        toast.error("That file couldn't be opened. Please try again.");
        return;
      }
      const a = document.createElement("a");
      a.href = url;
      a.download = attachment.fileName;
      a.target = "_blank";
      a.click();
    } catch (err) {
      console.error("Attachment download failed:", err);
      toast.error("That file couldn't be opened. Please try again.");
    } finally {
      setDownloading(null);
    }
  }

  return (
    <ul className="space-y-1.5">
      {attachments.map((attachment) => {
        const isImage = attachment.contentType.startsWith("image/");
        return (
          <li
            key={attachment.id}
            className="flex items-center gap-2.5 rounded-md bg-muted px-3 py-2"
          >
            {isImage ? (
              <RiImageLine
                aria-hidden
                className="size-4 shrink-0 text-muted-foreground"
              />
            ) : (
              <RiFileTextLine
                aria-hidden
                className="size-4 shrink-0 text-muted-foreground"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {attachment.fileName}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(attachment.fileSize)}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => handleDownload(attachment)}
              disabled={downloading === attachment.id}
              aria-label={`Download ${attachment.fileName}`}
            >
              {downloading === attachment.id ? (
                <RiLoader4Line className="size-3.5 animate-spin" />
              ) : (
                <RiDownloadLine className="size-3.5" />
              )}
            </Button>
            {onRemove && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onRemove(attachment)}
                disabled={removingId === attachment.id}
                aria-label={`Remove ${attachment.fileName}`}
              >
                {removingId === attachment.id ? (
                  <RiLoader4Line className="size-3.5 animate-spin" />
                ) : (
                  <RiDeleteBinLine className="size-3.5 text-destructive" />
                )}
              </Button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
