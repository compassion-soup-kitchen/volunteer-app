"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  RiDownloadLine,
  RiLoader4Line,
  RiFileTextLine,
} from "@remixicon/react";
import { IconChip } from "@/components/brand/icon-chip";
import {
  getDocumentDownloadUrl,
  type UploadedDocument,
} from "@/lib/document-actions";

const TYPE_LABELS: Record<string, string> = {
  POLICY: "Policy",
  TRAINING_MATERIAL: "Training material",
};

export function DownloadableFiles({
  documents,
}: {
  documents: UploadedDocument[];
}) {
  const [downloading, setDownloading] = useState<string | null>(null);

  async function handleDownload(id: string, fileName: string) {
    setDownloading(id);
    try {
      const url = await getDocumentDownloadUrl(id);
      if (url) {
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.target = "_blank";
        a.click();
      }
    } finally {
      setDownloading(null);
    }
  }

  if (documents.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <IconChip size="lg">
            <RiFileTextLine />
          </IconChip>
          <div>
            <p className="font-serif text-lg font-medium tracking-tight">
              No resources yet
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Policies and resources will appear here once uploaded.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <ul className="divide-y divide-border">
        {documents.map((doc) => (
          <li key={doc.id}>
            <button
              type="button"
              onClick={() => handleDownload(doc.id, doc.fileName)}
              disabled={downloading === doc.id}
              className="group flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-secondary/40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring disabled:opacity-60"
            >
              <span className="sr-only">Download </span>
              <IconChip size="sm">
                <RiFileTextLine />
              </IconChip>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold transition-colors group-hover:text-primary">
                  {doc.fileName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {TYPE_LABELS[doc.type] || doc.type}
                  {" · "}
                  {new Date(doc.uploadedAt).toLocaleDateString("en-NZ", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
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
      </ul>
    </Card>
  );
}
