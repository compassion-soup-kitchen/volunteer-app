"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BleedList } from "@/components/brand/detail-list";
import { IconChip } from "@/components/brand/icon-chip";
import {
  RiDownloadLine,
  RiFileTextLine,
  RiLoader4Line,
} from "@remixicon/react";
import { toast } from "sonner";
import { getDocumentDownloadUrl } from "@/lib/document-actions";
import { documentTypeLabel } from "@/lib/document-labels";
import type { VolunteerDetailDocument } from "@/lib/staff-actions";

/**
 * The files held against one volunteer - their ID, their MoJ form. Downloads go
 * through a short-lived signed URL rather than a stored link, so nothing here
 * is fetchable once the page is closed.
 */
export function VolunteerDocuments({
  documents,
}: {
  documents: VolunteerDetailDocument[];
}) {
  const [downloading, setDownloading] = useState<string | null>(null);

  async function handleDownload(id: string, fileName: string) {
    setDownloading(id);
    try {
      const url = await getDocumentDownloadUrl(id);
      if (!url) {
        toast.error("That file couldn't be opened. It may have been removed.");
        return;
      }
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.target = "_blank";
      a.click();
    } catch {
      toast.error("Something went wrong opening that file. Please try again.");
    } finally {
      setDownloading(null);
    }
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
      </CardHeader>
      {documents.length > 0 ? (
        <BleedList>
          {documents.map((doc) => (
            <li key={doc.id}>
              <button
                type="button"
                onClick={() => handleDownload(doc.id, doc.fileName)}
                disabled={downloading === doc.id}
                className="group flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-secondary/40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring disabled:opacity-60"
              >
                <span className="sr-only">Download </span>
                <IconChip size="sm">
                  <RiFileTextLine />
                </IconChip>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold transition-colors group-hover:text-primary">
                    {doc.fileName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {documentTypeLabel(doc.type)}
                    {" · "}
                    {new Date(doc.uploadedAt).toLocaleDateString("en-NZ", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                    {doc.uploadedByName && ` · ${doc.uploadedByName}`}
                  </p>
                </div>
                {downloading === doc.id ? (
                  <RiLoader4Line
                    className="size-4 shrink-0 animate-spin text-muted-foreground"
                    aria-hidden
                  />
                ) : (
                  <RiDownloadLine
                    className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
                    aria-hidden
                  />
                )}
              </button>
            </li>
          ))}
        </BleedList>
      ) : (
        <CardContent className="border-t border-border pt-4">
          <p className="text-sm text-muted-foreground">
            No files held for this volunteer.
          </p>
        </CardContent>
      )}
    </Card>
  );
}
