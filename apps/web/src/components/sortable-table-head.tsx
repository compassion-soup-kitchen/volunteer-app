"use client";

import { useState } from "react";
import { RiArrowDownLine, RiArrowUpDownLine, RiArrowUpLine } from "@remixicon/react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TableHead } from "@/components/ui/table";
import {
  ariaSort,
  formatSort,
  nextSort,
  type Sort,
  type SortDirection,
  type SortOption,
} from "@/lib/table-sort";
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

interface SortSelectProps<K extends string> {
  sort: Sort<K> | null;
  options: SortOption<K>[];
  onSort: (sort: Sort<K>) => void;
  /** Names what is being sorted, for screen readers: "Sort volunteers". */
  label: string;
  className?: string;
}

/**
 * The headers' stand-in where a table folds into a list on smaller screens:
 * the same sort, chosen from a menu, so the list's order is always visible
 * and changeable - including one that arrived in a shared `?sort=` link.
 */
export function SortSelect<K extends string>({
  sort,
  options,
  onSort,
  label,
  className,
}: SortSelectProps<K>) {
  return (
    <Select
      value={sort ? formatSort(sort) : ""}
      onValueChange={(value) => {
        const option = options.find((o) => formatSort(o.sort) === value);
        if (option) onSort(option.sort);
      }}
    >
      <SelectTrigger className={cn("w-full sm:w-60", className)}>
        <RiArrowUpDownLine aria-hidden className="text-muted-foreground" />
        {/* Not aria-label, which would hide the chosen order from screen readers. */}
        <span className="sr-only">{label}: </span>
        {/* Grows so the trigger's justify-between leaves the value beside the
            icon, not centred. Radix's SelectValue drops className, hence the span. */}
        <span className="min-w-0 flex-1 truncate text-left">
          <SelectValue placeholder="Sort by" />
        </span>
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => {
          const value = formatSort(option.sort);
          return (
            <SelectItem key={value} value={value}>
              {option.label}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
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
