"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  { value: "ALL", label: "All statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "DECLINED", label: "Declined" },
  { value: "INFO_REQUESTED", label: "Info requested" },
];

const STATUS_BADGE_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  PENDING: "default",
  APPROVED: "outline",
  DECLINED: "destructive",
  INFO_REQUESTED: "secondary",
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  DECLINED: "Declined",
  INFO_REQUESTED: "Info requested",
};

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
      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex w-full items-center gap-2 border border-input px-2.5 sm:flex-1">
          <RiSearchLine className="size-3.5 shrink-0 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full border-0 px-0 focus-visible:ring-0"
          />
        </div>
        <Select value={statusFilter} onValueChange={handleFilterChange}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isPending && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <RiLoader4Line className="size-4 animate-spin" />
          Loading...
        </div>
      )}

      {sorted.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <RiFileListLine className="mx-auto mb-3 size-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No applications found.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden sm:block">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Applicant</TableHead>
                    <TableHead>Interests</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Submitted</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.map((app) => (
                    <TableRow key={app.id} className="group">
                      <TableCell>
                        <Link
                          href={`/staff/applications/${app.id}`}
                          className="block"
                        >
                          <div className="font-medium group-hover:text-primary">
                            {app.volunteer.user.name || "Unnamed"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {app.volunteer.user.email}
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {app.volunteer.interests.slice(0, 2).map((i) => (
                            <Badge key={i.id} variant="outline" className="text-[10px]">
                              {i.name}
                            </Badge>
                          ))}
                          {app.volunteer.interests.length > 2 && (
                            <Badge variant="outline" className="text-[10px]">
                              +{app.volunteer.interests.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_BADGE_VARIANT[app.status] || "secondary"}>
                          {STATUS_LABEL[app.status] || app.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {format(app.submittedAt, "d MMM yyyy")}
                      </TableCell>
                      <TableCell>
                        <Link href={`/staff/applications/${app.id}`}>
                          <RiArrowRightSLine className="size-4 text-muted-foreground" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 sm:hidden">
            {sorted.map((app) => (
              <Link key={app.id} href={`/staff/applications/${app.id}`}>
                <Card className="transition-colors hover:border-primary/30">
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium">
                          {app.volunteer.user.name || "Unnamed"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {app.volunteer.user.email}
                        </p>
                      </div>
                      <Badge
                        variant={STATUS_BADGE_VARIANT[app.status] || "secondary"}
                        className="shrink-0"
                      >
                        {STATUS_LABEL[app.status] || app.status}
                      </Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {app.volunteer.interests.map((i) => (
                        <Badge key={i.id} variant="outline" className="text-[10px]">
                          {i.name}
                        </Badge>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Submitted {formatDistanceToNow(app.submittedAt, { addSuffix: true })}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
