"use client";

import { useState } from "react";
import { RiArrowDownLine, RiArrowUpDownLine, RiArrowUpLine } from "@remixicon/react";

import { TableHead } from "@/components/ui/table";
import { ariaSort, formatSort, nextSort, type Sort, type SortDirection } from "@/lib/table-sort";
import { cn } from "@/lib/utils";

interface SortableTableHeadProps<K extends string> {
  sortKey: K;
  sort: Sort<K> | null;
  /** Which way the column runs the first time it's picked. */
  firstDirection: SortDirection;
  onSort: (sort: Sort<K>) => void;
  /** Numbers and dates sit on the right, with the arrow before the label. */
  align?: "left" | "right";
  className?: string;
  children: React.ReactNode;
}

/**
 * A table header that sorts its column. The whole label is the button, the
 * header carries `aria-sort` while it's the one sorting, and the arrow shows
 * which way - a faint double arrow until then, so it's clear the column can
 * be sorted at all.
 */
export function SortableTableHead<K extends string>({
  sortKey,
  sort,
  firstDirection,
  onSort,
  align = "left",
  className,
  children,
}: SortableTableHeadProps<K>) {
  const state = ariaSort(sort, sortKey);
  const Icon =
    state === "ascending" ? RiArrowUpLine : state === "descending" ? RiArrowDownLine : RiArrowUpDownLine;

  return (
    <TableHead aria-sort={state} className={cn(align === "right" && "text-right", className)}>
      <button
        type="button"
        onClick={() => onSort(nextSort(sort, sortKey, firstDirection))}
        className={cn(
          "group/sort -mx-1.5 inline-flex items-center gap-1 rounded-sm px-1.5 py-1 transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-ring",
          align === "right" && "flex-row-reverse"
        )}
      >
        {children}
        <Icon
          aria-hidden
          className={cn(
            "size-3.5 shrink-0",
            state ? "text-primary" : "text-muted-foreground/60 group-hover/sort:text-primary"
          )}
        />
      </button>
    </TableHead>
  );
}

/**
 * A table's sort, kept in the URL's `?sort=` so it survives opening a record
 * and coming back. The page reads it on the server and passes it in, so the
 * first render is already sorted; changes replace the history entry rather
 * than adding one per click.
 */
export function useUrlSort<K extends string>(initial: Sort<K> | null) {
  const [sort, setSort] = useState(initial);

  function changeSort(next: Sort<K>) {
    setSort(next);
    const url = new URL(window.location.href);
    url.searchParams.set("sort", formatSort(next));
    window.history.replaceState(null, "", url);
  }

  return [sort, changeSort] as const;
}
