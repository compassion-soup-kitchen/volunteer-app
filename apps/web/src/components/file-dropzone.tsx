"use client";

import { useId, useRef, useState } from "react";
import { RiAlertLine, RiUploadCloud2Line } from "@remixicon/react";

import { IconChip } from "@/components/brand/icon-chip";
import { cn } from "@/lib/utils";
import { checkUploadFile } from "@/lib/uploads";

interface Rejection {
  fileName: string;
  reason: string;
}

/**
 * The place a file goes - drag and drop, or click/tab to browse.
 *
 * The visible surface is a `<label>` over a screen-reader-only file input, so
 * the keyboard path is the browser's own: the input takes focus, Enter or Space
 * opens the picker. Drag and drop is the shortcut, never the only way in.
 *
 * Files are checked the moment they're chosen and refusals are named right
 * here, under the zone - nobody should submit a form to be told a file was
 * always going to be too big.
 */
export function FileDropzone({
  id,
  accept,
  multiple = false,
  disabled = false,
  hint,
  maxFiles,
  maxFilesMessage,
  onFilesAccepted,
  className,
}: {
  /** Point a visible `<Label htmlFor>` at the input behind the zone. */
  id?: string;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  /** Persistent helper text - the formats and size ceiling. */
  hint?: React.ReactNode;
  /**
   * How many more files this zone will take right now. Defaults to 1 unless
   * `multiple` is set, since a drag ignores the input's `multiple` attribute.
   */
  maxFiles?: number;
  /** Shown when a drop carries more than there's room for. */
  maxFilesMessage?: string;
  onFilesAccepted: (files: File[]) => void;
  className?: string;
}) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = useId();
  // Dragging over a child fires dragleave on the parent, so a plain boolean
  // flickers. Counting enters and leaves is what keeps the highlight steady.
  const dragDepth = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const [rejections, setRejections] = useState<Rejection[]>([]);

  function takeFiles(fileList: FileList | null) {
    const chosen = Array.from(fileList ?? []);
    if (chosen.length === 0) return;

    const refused: Rejection[] = [];
    // `multiple` only constrains the OS file picker - a drag can carry any
    // number of files whatever it says - so a single-file zone has to hold
    // that line itself, or the extras vanish without a word.
    const room = maxFiles ?? (multiple ? chosen.length : 1);

    if (chosen.length > room) {
      const dropped = chosen.length - room;
      refused.push({
        fileName: `${dropped} file${dropped === 1 ? "" : "s"} not added`,
        reason:
          maxFilesMessage ??
          (multiple
            ? "That's more files than this will take."
            : "This takes one file at a time."),
      });
    }

    const accepted: File[] = [];
    for (const file of chosen.slice(0, Math.max(room, 0))) {
      const reason = checkUploadFile(file);
      if (reason) {
        refused.push({ fileName: file.name, reason });
        continue;
      }
      accepted.push(file);
    }

    setRejections(refused);
    if (accepted.length > 0) onFilesAccepted(accepted);
  }

  // Every handler calls preventDefault before it checks `disabled`, and that
  // order matters: leaving the dragover default in place means the browser
  // handles the drop itself and navigates the tab to file:///…, which on the
  // pānui dialog takes the half-written announcement with it. A disabled zone
  // has to swallow the drop, not ignore it.
  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    if (disabled) return;
    dragDepth.current += 1;
    setIsDragging(true);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    if (disabled) return;
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    if (disabled) return;
    dragDepth.current = 0;
    setIsDragging(false);
    takeFiles(e.dataTransfer.files);
  }

  return (
    <div className={className}>
      <label
        htmlFor={inputId}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "flex flex-col items-center gap-2 rounded-lg border border-dashed px-6 py-7 text-center transition-colors motion-reduce:transition-none",
          "has-[:focus-visible]:border-ring has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/30",
          disabled
            ? "cursor-not-allowed border-input bg-muted/40 opacity-60"
            : "cursor-pointer",
          !disabled &&
            (isDragging
              ? "border-primary bg-primary-tint"
              : "border-input bg-muted/40 hover:border-primary/40 hover:bg-muted")
        )}
      >
        <IconChip size="sm" tone={isDragging ? "brand" : "neutral"}>
          <RiUploadCloud2Line />
        </IconChip>
        <span className="text-sm font-medium">
          Drop {multiple ? "files" : "a file"} here, or{" "}
          <span className="text-primary underline underline-offset-4">
            browse
          </span>
        </span>
        {hint && (
          <span className="text-xs text-muted-foreground">{hint}</span>
        )}
        <input
          id={inputId}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          aria-describedby={rejections.length > 0 ? errorId : undefined}
          className="sr-only"
          onChange={(e) => {
            takeFiles(e.target.files);
            // Let the same file be picked twice running - without this, a
            // re-pick after a removal fires no change event at all.
            e.target.value = "";
          }}
        />
      </label>

      {rejections.length > 0 && (
        <div
          id={errorId}
          role="alert"
          className="mt-2 flex gap-2 rounded-md bg-destructive-tint px-3 py-2 text-destructive-tint-foreground"
        >
          <RiAlertLine aria-hidden className="mt-0.5 size-4 shrink-0" />
          <ul className="min-w-0 space-y-1 text-xs">
            {rejections.map((rejection, index) => (
              <li key={`${rejection.fileName}-${index}`}>
                <span className="font-semibold break-words">
                  {rejection.fileName}
                </span>{" "}
                - {rejection.reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
