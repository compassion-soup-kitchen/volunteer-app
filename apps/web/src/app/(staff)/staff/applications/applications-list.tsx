"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/brand/status-badge";
import {
  RiSearchLine,
  RiArrowRightSLine,
  RiFileListLine,
  RiLoader4Line,
} from "@remixicon/react";
import { formatDistanceToNow } from "date-fns";
import { formatTimestamp } from "@/lib/format";
import {
  getApplicationsList,
  type ApplicationListItem,
} from "@/lib/staff-actions";
import { BleedList } from "@/components/brand/detail-list";
import { SortableTableHead, SortSelect, useUrlSort } from "@/components/sortable-table-head";
import {
  APPLICATION_COLUMNS,
  APPLICATION_SORT_OPTIONS,
  DEFAULT_APPLICATION_SORT,
  sortApplications,
  type ApplicationSortKey,
  type Sort,
} from "@/lib/table-sort";
import { PersonAvatar } from "@/components/brand/person-avatar";
import { rowLinkVariants } from "@/components/brand/row-link";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/brand/empty-state";

const STATUS_OPTIONS = [
  { value: "ALL", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "DECLINED", label: "Declined" },
  { value: "INFO_REQUESTED", label: "Info requested" },
];


interface ApplicationsListProps {
  initialApplications: ApplicationListItem[];
  // `?sort=` from the URL, so the first render is already sorted.
  initialSort: Sort<ApplicationSortKey> | null;
}

export function ApplicationsList({ initialApplications, initialSort }: ApplicationsListProps) {
  const [applications, setApplications] = useState(initialApplications);
  const [sortChoice, setSort] = useUrlSort(initialSort);
  const sort = sortChoice ?? DEFAULT_APPLICATION_SORT;
  const sorted = useMemo(() => sortApplications(applications, sort), [applications, sort]);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleFilterChange(status: string) {
    setStatusFilter(status);
    startTransition(async () => {
      const result = await getApplicationsList({ status, search });
      setApplications(result);
    });
  }

  function handleSearch(value: string) {
    setSearch(value);
    startTransition(async () => {
      const result = await getApplicationsList({
        status: statusFilter,
        search: value,
      });
      setApplications(result);
    });
  }

  function sortProps(key: ApplicationSortKey) {
    return {
      sortKey: key,
      sort,
      firstDirection: APPLICATION_COLUMNS[key].firstDirection,
      onSort: setSort,
    };
  }

  return (
    <div className="space-y-4">
      {/* Search + segmented status filter */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative w-full lg:max-w-xs">
          <RiSearchLine
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            placeholder="Search by name or email…"
            aria-label="Search applications by name or email"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Tabs
            value={statusFilter}
            onValueChange={handleFilterChange}
            className="min-w-0 max-w-full overflow-x-auto"
          >
            <TabsList className="h-9">
              {STATUS_OPTIONS.map((opt) => (
                <TabsTrigger key={opt.value} value={opt.value} className="px-2.5 text-xs">
                  {opt.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <Badge variant="neutral" className="tnum ml-auto shrink-0">
            {sorted.length} {sorted.length === 1 ? "application" : "applications"}
          </Badge>
        </div>
      </div>

      {isPending && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <RiLoader4Line className="size-4 animate-spin" aria-hidden />
          Loading…
        </div>
      )}

      {sorted.length === 0 ? (
        <EmptyState
          icon={<RiFileListLine />}
          title="No applications found"
          description="Try a different search or status filter."
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block">
            <Card>
              <Table className="[&_td]:px-3 [&_th]:px-3 [&_td:first-child]:pl-5 [&_th:first-child]:pl-5 [&_td:last-child]:pr-5 [&_th:last-child]:pr-5">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <SortableTableHead {...sortProps("name")}>Applicant</SortableTableHead>
                    <TableHead>Interests</TableHead>
                    <SortableTableHead {...sortProps("status")}>Status</SortableTableHead>
                    <SortableTableHead {...sortProps("submitted")} align="right">
                      Submitted
                    </SortableTableHead>
                    <TableHead className="w-10">
                      <span className="sr-only">Open</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.map((app) => (
                    <TableRow key={app.id} className="group hover:bg-secondary/40">
                      <TableCell>
                        <Link
                          href={`/staff/applications/${app.id}`}
                          className="flex items-center gap-3 rounded-sm focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                        >
                          <PersonAvatar name={app.volunteer.user.name} />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold">
                              {app.volunteer.user.name || "Unnamed"}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {app.volunteer.user.email}
                            </span>
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {app.volunteer.interests.slice(0, 2).map((i) => (
                            <Badge key={i.id} variant="outline">
                              {i.name}
                            </Badge>
                          ))}
                          {app.volunteer.interests.length > 2 && (
                            <Badge variant="neutral" className="tnum">
                              +{app.volunteer.interests.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={app.status} />
                      </TableCell>
                      <TableCell className="tnum text-right text-muted-foreground">
                        {formatTimestamp(app.submittedAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/staff/applications/${app.id}`}
                          aria-label={`Review application from ${
                            app.volunteer.user.name || "unnamed applicant"
                          }`}
                          className="inline-flex rounded-sm p-1 text-muted-foreground transition-transform group-hover:translate-x-0.5 focus-visible:outline-2 focus-visible:outline-ring"
                        >
                          <RiArrowRightSLine className="size-4" aria-hidden />
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>

          {/* Mobile hairline list - no headers, so the sort is a menu. */}
          <SortSelect
            sort={sort}
            options={APPLICATION_SORT_OPTIONS}
            onSort={setSort}
            label="Sort applications"
            className="md:hidden"
          />
          <Card className="md:hidden">
            <BleedList>
              {sorted.map((app) => (
                <li key={app.id}>
                  <Link
                    href={`/staff/applications/${app.id}`}
                    className={cn(rowLinkVariants(), "items-start")}
                  >
                    <PersonAvatar name={app.volunteer.user.name} className="mt-0.5" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold">
                          {app.volunteer.user.name || "Unnamed"}
                        </span>
                        <StatusBadge status={app.status} className="shrink-0" />
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {app.volunteer.user.email}
                      </span>
                      {app.volunteer.interests.length > 0 && (
                        <span className="mt-2 flex flex-wrap gap-1">
                          {app.volunteer.interests.map((i) => (
                            <Badge key={i.id} variant="outline">
                              {i.name}
                            </Badge>
                          ))}
                        </span>
                      )}
                      <span className="mt-2 block text-xs text-muted-foreground">
                        Submitted{" "}
                        {formatDistanceToNow(app.submittedAt, { addSuffix: true })}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </BleedList>
          </Card>
        </>
      )}
    </div>
  );
}
