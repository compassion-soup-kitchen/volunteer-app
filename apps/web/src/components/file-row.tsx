import { cva, type VariantProps } from "class-variance-authority";
import { RiFileTextLine, RiImageLine } from "@remixicon/react";

import { IconChip } from "@/components/brand/icon-chip";
import { cn } from "@/lib/utils";

const fileRowVariants = cva("flex items-center gap-3", {
  variants: {
    variant: {
      /** A row in a hairline-divided list sitting directly on a card. */
      list: "px-5 py-3",
      /** A standalone recessed chip - attachments, files queued for upload. */
      well: "rounded-md bg-muted px-3 py-2",
    },
  },
  defaultVariants: { variant: "well" },
});

interface FileRowProps
  extends Omit<React.ComponentProps<"li">, "children">,
    VariantProps<typeof fileRowVariants> {
  fileName: string;
  /** The quiet second line - size, who uploaded it, when. */
  meta?: React.ReactNode;
  /** Picks the icon; images get a distinct one. */
  contentType?: string;
  /** Trailing controls - download, remove, a badge. */
  actions?: React.ReactNode;
}

/**
 * One file, wherever files are listed - the staff document library, pānui
 * attachments, and the queue of files waiting to upload.
 *
 * Kept in one place so a file looks like a file everywhere: same icon anchor,
 * same truncation, same slot for trailing controls.
 */
export function FileRow({
  fileName,
  meta,
  contentType,
  actions,
  variant,
  className,
  ...props
}: FileRowProps) {
  const Icon = contentType?.startsWith("image/") ? RiImageLine : RiFileTextLine;

  return (
    <li className={cn(fileRowVariants({ variant }), className)} {...props}>
      <IconChip size="sm">
        <Icon />
      </IconChip>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{fileName}</p>
        {meta && <p className="text-xs text-muted-foreground">{meta}</p>}
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-1">{actions}</div>
      )}
    </li>
  );
}
