"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/brand/status-badge";
import { IconChip } from "@/components/brand/icon-chip";
import {
  RiSearchLine,
  RiArrowRightSLine,
  RiFileListLine,
  RiLoader4Line,
} from "@remixicon/react";
import { formatDistanceToNow, format } from "date-fns";
import {
  getApplicationsList,
  type ApplicationListItem,
} from "@/lib/staff-actions";

const STATUS_OPTIONS = [
  { value: "ALL", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "DECLINED", label: "Declined" },
  { value: "INFO_REQUESTED", label: "Info requested" },
];

function initials(name: string | null | undefined) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase() || "?";
}

interface ApplicationsListProps {
  initialApplications: ApplicationListItem[];
}

export function ApplicationsList({ initialApplications }: ApplicationsListProps) {
  const [applications, setApplications] = useState(initialApplications);
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

  const pending = applications.filter((a) => a.status === "PENDING");
  const others = applications.filter((a) => a.status !== "PENDING");
  const sorted = [...pending, ...others];

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
            placeholder="Search by name or email..."
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
          Loading...
        </div>
      )}

      {sorted.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <IconChip size="lg">
              <RiFileListLine />
            </IconChip>
            <div>
              <p className="font-serif text-lg font-medium tracking-tight">
                No applications found
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try a different search or status filter.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden sm:block">
            <Card>
              <Table className="[&_td]:px-3 [&_th]:px-3 [&_td:first-child]:pl-5 [&_th:first-child]:pl-5 [&_td:last-child]:pr-5 [&_th:last-child]:pr-5">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Applicant</TableHead>
                    <TableHead>Interests</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Submitted</TableHead>
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
                          <span
                            aria-hidden
                            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-neutral-tint text-xs font-bold text-neutral-tint-foreground"
                          >
                            {initials(app.volunteer.user.name)}
                          </span>
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
                        {format(app.submittedAt, "d MMM yyyy")}
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

          {/* Mobile hairline list */}
          <Card className="sm:hidden">
            <ul className="divide-y divide-border">
              {sorted.map((app) => (
                <li key={app.id}>
                  <Link
                    href={`/staff/applications/${app.id}`}
                    className="flex items-start gap-3 px-5 py-3 transition-colors hover:bg-secondary/40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                  >
                    <span
                      aria-hidden
                      className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-neutral-tint text-xs font-bold text-neutral-tint-foreground"
                    >
                      {initials(app.volunteer.user.name)}
                    </span>
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
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
