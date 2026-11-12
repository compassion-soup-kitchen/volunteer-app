"use client";

import { RiCloseLine } from "@remixicon/react";

import { Button } from "@/components/ui/button";
import { FileRow } from "@/components/file-row";
import { formatFileSize } from "@/lib/uploads";

/** The file waiting to go up, with a way to take it back out. */
export function ChosenFile({
  file,
  onClear,
  disabled,
}: {
  file: File | null;
  onClear: () => void;
  disabled?: boolean;
}) {
  if (!file) return null;
  return (
    <ul>
      <FileRow
        fileName={file.name}
        contentType={file.type}
        meta={formatFileSize(file.size)}
        actions={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onClear}
            disabled={disabled}
            aria-label={`Remove ${file.name}`}
          >
            <RiCloseLine className="size-3.5" />
          </Button>
        }
      />
    </ul>
  );
}
