"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  RiSearchLine,
  RiTeamLine,
  RiMoreLine,
  RiLoader4Line,
  RiCheckLine,
  RiUserLine,
  RiShieldCheckLine,
} from "@remixicon/react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  getVolunteersList,
  updateVolunteerStatus,
  type VolunteerListItem,
} from "@/lib/staff-actions";

const STATUS_OPTIONS = [
  { value: "ALL", label: "All statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "APPLICATION_SUBMITTED", label: "Application submitted" },
  { value: "AWAITING_VETTING", label: "Awaiting vetting" },
  { value: "APPROVED_FOR_INDUCTION", label: "Approved for induction" },
  { value: "INACTIVE", label: "Inactive" },
];

const STATUS_BADGE_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  ACTIVE: "default",
  APPLICATION_SUBMITTED: "secondary",
  AWAITING_VETTING: "secondary",
  APPROVED_FOR_INDUCTION: "outline",
  INACTIVE: "destructive",
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Active",
  APPLICATION_SUBMITTED: "Applied",
  AWAITING_VETTING: "Awaiting vetting",
  APPROVED_FOR_INDUCTION: "Approved",
  INACTIVE: "Inactive",
};

const MOJ_BADGE_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  NOT_STARTED: "secondary",
  SUBMITTED: "default",
  CLEARED: "outline",
  FLAGGED: "destructive",
};

const MOJ_LABEL: Record<string, string> = {
  NOT_STARTED: "Not started",
  SUBMITTED: "Submitted",
  CLEARED: "Cleared",
  FLAGGED: "Flagged",
};

interface VolunteerDirectoryProps {
  initialVolunteers: VolunteerListItem[];
}

export function VolunteerDirectory({
  initialVolunteers,
}: VolunteerDirectoryProps) {
  const [volunteers, setVolunteers] = useState(initialVolunteers);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleFilterChange(status: string) {
    setStatusFilter(status);
    startTransition(async () => {
      const result = await getVolunteersList({ status, search });
      setVolunteers(result);
    });
  }

  function handleSearch(value: string) {
    setSearch(value);
    startTransition(async () => {
      const result = await getVolunteersList({
        status: statusFilter,
        search: value,
      });
      setVolunteers(result);
    });
  }

  async function handleStatusChange(
    volunteer: VolunteerListItem,
    newStatus:
      | "ACTIVE"
      | "INACTIVE"
      | "AWAITING_VETTING"
      | "APPROVED_FOR_INDUCTION"
  ) {
    const result = await updateVolunteerStatus(volunteer.id, newStatus);
    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success(
      `${volunteer.user.name || "Volunteer"} status updated to ${STATUS_LABEL[
        newStatus
      ]?.toLowerCase()}.`
    );

    startTransition(async () => {
      const refreshed = await getVolunteersList({
        status: statusFilter,
        search,
      });
      setVolunteers(refreshed);
    });
  }

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
          <SelectTrigger className="w-full sm:w-52">
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

      {volunteers.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <RiTeamLine className="mx-auto mb-3 size-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No volunteers found.
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
                    <TableHead>Volunteer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>MOJ</TableHead>
                    <TableHead>Interests</TableHead>
                    <TableHead style={{ textAlign: "right" }}>Shifts</TableHead>
                    <TableHead style={{ textAlign: "right" }}>Joined</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {volunteers.map((vol) => (
                    <TableRow key={vol.id}>
                      <TableCell>
                        <div className="font-medium">
                          {vol.user.name || "Unnamed"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {vol.user.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            STATUS_BADGE_VARIANT[vol.status] || "secondary"
                          }
                        >
                          {STATUS_LABEL[vol.status] || vol.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            MOJ_BADGE_VARIANT[vol.mojStatus] || "secondary"
                          }
                        >
                          {MOJ_LABEL[vol.mojStatus] || vol.mojStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {vol.interests.slice(0, 2).map((i) => (
                            <Badge
                              key={i.id}
                              variant="outline"
                              className="text-[10px]"
                            >
                              {i.name}
                            </Badge>
                          ))}
                          {vol.interests.length > 2 && (
                            <Badge variant="outline" className="text-[10px]">
                              +{vol.interests.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm" style={{ textAlign: "right" }}>
                        {vol._count.shiftSignups}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground" style={{ textAlign: "right" }}>
                        {format(vol.createdAt, "d MMM yy")}
                      </TableCell>
                      <TableCell>
                        <StatusMenu
                          volunteer={vol}
                          onStatusChange={handleStatusChange}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 sm:hidden">
            {volunteers.map((vol) => (
              <Card key={vol.id}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium">
                        {vol.user.name || "Unnamed"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {vol.user.email}
                      </p>
                    </div>
                    <StatusMenu
                      volunteer={vol}
                      onStatusChange={handleStatusChange}
                    />
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge
                      variant={STATUS_BADGE_VARIANT[vol.status] || "secondary"}
                    >
                      {STATUS_LABEL[vol.status] || vol.status}
                    </Badge>
                    <Badge
                      variant={MOJ_BADGE_VARIANT[vol.mojStatus] || "secondary"}
                    >
                      MOJ: {MOJ_LABEL[vol.mojStatus] || vol.mojStatus}
                    </Badge>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1">
                    {vol.interests.map((i) => (
                      <Badge
                        key={i.id}
                        variant="outline"
                        className="text-[10px]"
                      >
                        {i.name}
                      </Badge>
                    ))}
                  </div>

                  <div className="mt-2 flex items-center justify-end gap-4 text-xs text-muted-foreground">
                    <span>Joined {format(vol.createdAt, "d MMM yyyy")}</span>
                    <span className="font-mono">{vol._count.shiftSignups} shifts</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function StatusMenu({
  volunteer,
  onStatusChange,
}: {
  volunteer: VolunteerListItem;
  onStatusChange: (
    vol: VolunteerListItem,
    status:
      | "ACTIVE"
      | "INACTIVE"
      | "AWAITING_VETTING"
      | "APPROVED_FOR_INDUCTION"
  ) => void;
}) {
  const availableStatuses = [
    { value: "ACTIVE", label: "Set Active", icon: RiCheckLine },
    {
      value: "APPROVED_FOR_INDUCTION",
      label: "Approved for Induction",
      icon: RiShieldCheckLine,
    },
    { value: "AWAITING_VETTING", label: "Awaiting Vetting", icon: RiUserLine },
    { value: "INACTIVE", label: "Set Inactive", icon: RiUserLine },
  ].filter((s) => s.value !== volunteer.status);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm">
          <RiMoreLine className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {availableStatuses.map((s) => (
          <DropdownMenuItem
            key={s.value}
            onClick={() =>
              onStatusChange(
                volunteer,
                s.value as
                  | "ACTIVE"
                  | "INACTIVE"
                  | "AWAITING_VETTING"
                  | "APPROVED_FOR_INDUCTION"
              )
            }
          >
            <s.icon className="mr-2 size-4" />
            {s.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
