"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  RiDownloadLine,
  RiLoader4Line,
  RiFileLine,
  RiFileTextLine,
} from "@remixicon/react";
import {
  getDocumentDownloadUrl,
  type UploadedDocument,
} from "@/lib/document-actions";

const TYPE_LABELS: Record<string, string> = {
  POLICY: "Policy",
  TRAINING_MATERIAL: "Training Material",
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
        <CardContent className="py-8 text-center">
          <RiFileTextLine className="mx-auto size-8 text-muted-foreground/40" />
          <p className="mt-2 text-sm text-muted-foreground">
            No policies or resources available yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="flex items-center justify-between rounded-md border border-border p-3"
        >
          <div className="flex items-center gap-3 min-w-0">
            <RiFileLine className="size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{doc.fileName}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(doc.uploadedAt).toLocaleDateString("en-NZ", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="outline" className="text-xs">
              {TYPE_LABELS[doc.type] || doc.type}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownload(doc.id, doc.fileName)}
              disabled={downloading === doc.id}
            >
              {downloading === doc.id ? (
                <RiLoader4Line className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <RiDownloadLine className="mr-1.5 size-3.5" />
              )}
              Download
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
