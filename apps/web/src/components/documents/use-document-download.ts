"use client";

import { useState } from "react";
import { toast } from "sonner";

import { getDocumentDownloadUrl } from "@/lib/document-actions";

/**
 * Opens a stored file through a short-lived signed URL rather than a stored
 * link, so nothing is fetchable once the page is closed. `downloading` is the
 * id of the file being fetched, for a spinner on its row.
 */
export function useDocumentDownload() {
  const [downloading, setDownloading] = useState<string | null>(null);

  async function download(id: string, fileName: string) {
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
    } catch (err) {
      console.error("Document download failed:", err);
      toast.error("That file couldn't be opened. Please try again.");
    } finally {
      setDownloading(null);
    }
  }

  return { downloading, download };
}
