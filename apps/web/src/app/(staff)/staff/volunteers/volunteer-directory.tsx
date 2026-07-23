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
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/brand/status-badge";
import { IconChip } from "@/components/brand/icon-chip";
import {
  RiSearchLine,
  RiTeamLine,
  RiMoreLine,
  RiLoader4Line,
  RiCheckLine,
  RiUserLine,
  RiShieldCheckLine,
  RiArchive2Line,
  RiArrowGoBackLine,
  RiUserSettingsLine,
  RiShieldUserLine,
  RiUserStarLine,
} from "@remixicon/react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  getVolunteersList,
  updateVolunteerStatus,
  archiveVolunteer,
  restoreVolunteer,
  updateUserRole,
  type VolunteerListItem,
} from "@/lib/staff-actions";
import {
  ASSIGNABLE_ROLES,
  isAssignableRole,
  type AssignableRole,
} from "@/lib/role-change";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";

const STATUS_OPTIONS = [
  { value: "ALL", label: "All statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "APPLICATION_SUBMITTED", label: "Application submitted" },
  { value: "AWAITING_VETTING", label: "Awaiting vetting" },
  { value: "APPROVED_FOR_INDUCTION", label: "Approved for induction" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "NO_APPLICATION", label: "No application yet" },
];

// Human-readable status names for toast copy (badges derive their own labels
// via StatusBadge).
const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Active",
  APPLICATION_SUBMITTED: "Applied",
  AWAITING_VETTING: "Awaiting vetting",
  APPROVED_FOR_INDUCTION: "Approved",
  INACTIVE: "Inactive",
};

const ROLE_LABEL: Record<AssignableRole, string> = {
  VOLUNTEER: "Volunteer",
  COORDINATOR: "Coordinator",
  ADMIN: "Admin",
};

const ROLE_ICON: Record<AssignableRole, typeof RiUserLine> = {
  VOLUNTEER: RiUserLine,
  COORDINATOR: RiUserStarLine,
  ADMIN: RiShieldUserLine,
};

// Only elevated roles get a badge — VOLUNTEER is the default, badging everyone
// would just add noise.
const ROLE_BADGE_VARIANT: Partial<Record<string, "default" | "info">> = {
  COORDINATOR: "info",
  ADMIN: "default",
};

function initials(name: string | null | undefined) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase() || "?";
}

interface VolunteerDirectoryProps {
  initialVolunteers: VolunteerListItem[];
  // The signed-in admin's user id — used to stop them changing their own role.
  currentUserId: string;
  // Role controls are ADMIN-only; coordinators see the directory without them.
  isAdmin: boolean;
}

const ACCOUNT_OPTIONS: { value: "ACTIVE" | "ARCHIVED" | "ALL"; label: string }[] =
  [
    { value: "ACTIVE", label: "Active accounts" },
    { value: "ARCHIVED", label: "Archived only" },
    { value: "ALL", label: "All accounts" },
  ];

export function VolunteerDirectory({
  initialVolunteers,
  currentUserId,
  isAdmin,
}: VolunteerDirectoryProps) {
  const [volunteers, setVolunteers] = useState(initialVolunteers);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [accountFilter, setAccountFilter] = useState<"ACTIVE" | "ARCHIVED" | "ALL">(
    "ACTIVE"
  );
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const [archiveTarget, setArchiveTarget] = useState<VolunteerListItem | null>(
    null
  );
  const [archiveReason, setArchiveReason] = useState("");
  const [archiving, setArchiving] = useState(false);
  const [roleTarget, setRoleTarget] = useState<{
    volunteer: VolunteerListItem;
    newRole: AssignableRole;
  } | null>(null);
  const [changingRole, setChangingRole] = useState(false);

  function reload(next: {
    status?: string;
    account?: "ACTIVE" | "ARCHIVED" | "ALL";
    search?: string;
  }) {
    startTransition(async () => {
      const result = await getVolunteersList({
        status: next.status ?? statusFilter,
        userStatus: next.account ?? accountFilter,
        search: next.search ?? search,
      });
      setVolunteers(result);
    });
  }

  function handleFilterChange(status: string) {
    setStatusFilter(status);
    reload({ status });
  }

  function handleAccountFilterChange(value: "ACTIVE" | "ARCHIVED" | "ALL") {
    setAccountFilter(value);
    reload({ account: value });
  }

  function handleSearch(value: string) {
    setSearch(value);
    reload({ search: value });
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

    reload({});
  }

  async function handleArchiveConfirm() {
    if (!archiveTarget) return;
    setArchiving(true);
    const result = await archiveVolunteer(archiveTarget.user.id, archiveReason);
    setArchiving(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(
      `${archiveTarget.user.name || "Volunteer"} archived. Their hours stay in reporting.`
    );
    setArchiveTarget(null);
    setArchiveReason("");
    reload({});
  }

  async function handleRestore(volunteer: VolunteerListItem) {
    const result = await restoreVolunteer(volunteer.user.id);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(`${volunteer.user.name || "Volunteer"} restored.`);
    reload({});
  }

  async function handleRoleChangeConfirm() {
    if (!roleTarget) return;
    setChangingRole(true);
    const result = await updateUserRole(
      roleTarget.volunteer.user.id,
      roleTarget.newRole
    );
    setChangingRole(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    const roleLabel = ROLE_LABEL[roleTarget.newRole].toLowerCase();
    const article = roleTarget.newRole === "ADMIN" ? "an" : "a";
    toast.success(
      `${roleTarget.volunteer.user.name || "This person"} is now ${article} ${roleLabel}. They'll need to sign out and back in for it to take effect.`
    );
    setRoleTarget(null);
    reload({});
  }

  return (
    <div className="space-y-4">
      {/* Search + filters */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative w-full lg:max-w-xs">
          <RiSearchLine
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            placeholder="Search by name or email..."
            aria-label="Search volunteers by name or email"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
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
          <Select
            value={accountFilter}
            onValueChange={(v) =>
              handleAccountFilterChange(v as "ACTIVE" | "ARCHIVED" | "ALL")
            }
          >
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACCOUNT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="neutral" className="tnum shrink-0 sm:ml-auto">
            {volunteers.length} {volunteers.length === 1 ? "person" : "people"}
          </Badge>
        </div>
      </div>

      {isPending && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <RiLoader4Line className="size-4 animate-spin" aria-hidden />
          Loading...
        </div>
      )}

      {volunteers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <IconChip size="lg">
              <RiTeamLine />
            </IconChip>
            <div>
              <p className="font-serif text-lg font-medium tracking-tight">
                No volunteers found
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try adjusting your search or filters.
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
                    <TableHead>Volunteer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>MoJ</TableHead>
                    <TableHead>Interests</TableHead>
                    <TableHead className="text-right">Shifts</TableHead>
                    <TableHead className="text-right">Joined</TableHead>
                    <TableHead className="w-10">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {volunteers.map((vol) => (
                    <TableRow
                      key={vol.id}
                      className={cn(
                        "hover:bg-secondary/40",
                        vol.user.status === "ARCHIVED" && "opacity-60"
                      )}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <span
                            aria-hidden
                            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-neutral-tint text-xs font-bold text-neutral-tint-foreground"
                          >
                            {initials(vol.user.name)}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="truncate text-sm font-semibold">
                                {vol.user.name || "Unnamed"}
                              </span>
                              {ROLE_BADGE_VARIANT[vol.user.role] && (
                                <Badge variant={ROLE_BADGE_VARIANT[vol.user.role]}>
                                  {ROLE_LABEL[vol.user.role as AssignableRole] ??
                                    vol.user.role}
                                </Badge>
                              )}
                              {vol.user.status === "ARCHIVED" && (
                                <StatusBadge status="ARCHIVED" />
                              )}
                            </div>
                            <div className="truncate text-xs text-muted-foreground">
                              {vol.user.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {vol.hasProfile && vol.status ? (
                          <StatusBadge status={vol.status} />
                        ) : (
                          <Badge variant="outline">No application yet</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {vol.hasProfile && vol.mojStatus ? (
                          <StatusBadge status={vol.mojStatus} />
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {vol.interests.slice(0, 2).map((i) => (
                            <Badge key={i.id} variant="outline">
                              {i.name}
                            </Badge>
                          ))}
                          {vol.interests.length > 2 && (
                            <Badge variant="neutral" className="tnum">
                              +{vol.interests.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="tnum text-right">
                        {vol._count.shiftSignups}
                      </TableCell>
                      <TableCell className="tnum text-right text-muted-foreground">
                        {format(vol.createdAt, "d MMM yy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <StatusMenu
                          volunteer={vol}
                          isAdmin={isAdmin}
                          currentUserId={currentUserId}
                          onStatusChange={handleStatusChange}
                          onArchive={(v) => setArchiveTarget(v)}
                          onRestore={handleRestore}
                          onChangeRole={(v, newRole) =>
                            setRoleTarget({ volunteer: v, newRole })
                          }
                        />
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
              {volunteers.map((vol) => (
                <li
                  key={vol.id}
                  className={cn(
                    "flex items-start gap-3 px-5 py-3",
                    vol.user.status === "ARCHIVED" && "opacity-60"
                  )}
                >
                  <span
                    aria-hidden
                    className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-neutral-tint text-xs font-bold text-neutral-tint-foreground"
                  >
                    {initials(vol.user.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="text-sm font-semibold">
                        {vol.user.name || "Unnamed"}
                      </p>
                      {ROLE_BADGE_VARIANT[vol.user.role] && (
                        <Badge variant={ROLE_BADGE_VARIANT[vol.user.role]}>
                          {ROLE_LABEL[vol.user.role as AssignableRole] ??
                            vol.user.role}
                        </Badge>
                      )}
                      {vol.user.status === "ARCHIVED" && (
                        <StatusBadge status="ARCHIVED" />
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {vol.user.email}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {vol.hasProfile && vol.status ? (
                        <>
                          <StatusBadge status={vol.status} />
                          {vol.mojStatus && (
                            <span className="inline-flex items-center gap-1">
                              <span className="eyebrow text-[0.62rem] text-muted-foreground">
                                MoJ
                              </span>
                              <StatusBadge status={vol.mojStatus} />
                            </span>
                          )}
                        </>
                      ) : (
                        <Badge variant="outline">No application yet</Badge>
                      )}
                    </div>

                    {vol.interests.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {vol.interests.map((i) => (
                          <Badge key={i.id} variant="outline">
                            {i.name}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <p className="mt-2 text-xs text-muted-foreground">
                      Joined {format(vol.createdAt, "d MMM yyyy")}
                      {" · "}
                      <span className="tnum">{vol._count.shiftSignups}</span>{" "}
                      {vol._count.shiftSignups === 1 ? "shift" : "shifts"}
                    </p>
                  </div>
                  <StatusMenu
                    volunteer={vol}
                    isAdmin={isAdmin}
                    currentUserId={currentUserId}
                    onStatusChange={handleStatusChange}
                    onArchive={(v) => setArchiveTarget(v)}
                    onRestore={handleRestore}
                    onChangeRole={(v, newRole) =>
                      setRoleTarget({ volunteer: v, newRole })
                    }
                  />
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}

      <AlertDialog
        open={archiveTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setArchiveTarget(null);
            setArchiveReason("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Archive {archiveTarget?.user.name || "this volunteer"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              They&apos;ll lose access to log in and won&apos;t appear in active rosters.
              Their past hours and meals served stay in reporting. You can
              restore them later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <label htmlFor="archive-reason" className="text-sm font-medium">
              Reason (optional)
            </label>
            <Textarea
              id="archive-reason"
              value={archiveReason}
              onChange={(e) => setArchiveReason(e.target.value)}
              placeholder="e.g. Moved away, no longer available"
              rows={2}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={archiving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchiveConfirm}
              disabled={archiving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {archiving ? (
                <>
                  <RiLoader4Line className="mr-2 size-4 animate-spin" />
                  Archiving...
                </>
              ) : (
                "Archive account"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={roleTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRoleTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {roleTarget &&
                `Make ${roleTarget.volunteer.user.name || "this person"} ${ROLE_LABEL[
                  roleTarget.newRole
                ].toLowerCase()}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {roleTarget?.newRole === "ADMIN"
                ? "Admins have full access, including reporting, service areas, and managing everyone's roles. Only grant this to people you trust with the whole system."
                : roleTarget?.newRole === "COORDINATOR"
                  ? "Coordinators can manage applications, rostering, training, and announcements."
                  : // Making someone a volunteer is either demoting a staff
                    // member or adding a not-yet-applied person as a full
                    // volunteer - the copy differs.
                    roleTarget?.volunteer.user.role === "COORDINATOR" ||
                      roleTarget?.volunteer.user.role === "ADMIN"
                    ? "This removes their staff access. They'll return to a standard volunteer account."
                    : "This adds them as a full volunteer - they'll be able to sign up for shifts and training. It skips the usual application and vetting, so only do this for people you know."}{" "}
              They&apos;ll need to sign out and back in for the change to take
              effect.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={changingRole}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRoleChangeConfirm}
              disabled={changingRole}
            >
              {changingRole ? (
                <>
                  <RiLoader4Line className="mr-2 size-4 animate-spin" />
                  Updating...
                </>
              ) : (
                roleTarget &&
                `Make ${ROLE_LABEL[roleTarget.newRole].toLowerCase()}`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatusMenu({
  volunteer,
  isAdmin,
  currentUserId,
  onStatusChange,
  onArchive,
  onRestore,
  onChangeRole,
}: {
  volunteer: VolunteerListItem;
  isAdmin: boolean;
  currentUserId: string;
  onStatusChange: (
    vol: VolunteerListItem,
    status:
      | "ACTIVE"
      | "INACTIVE"
      | "AWAITING_VETTING"
      | "APPROVED_FOR_INDUCTION"
  ) => void;
  onArchive: (vol: VolunteerListItem) => void;
  onRestore: (vol: VolunteerListItem) => void;
  onChangeRole: (vol: VolunteerListItem, newRole: AssignableRole) => void;
}) {
  const isArchived = volunteer.user.status === "ARCHIVED";
  // Admins can change anyone's role except their own (guards against
  // self-lockout; the server enforces this too). Pending applicants (PUBLIC
  // *with* a profile) go through application approval, not this control. But
  // someone who signed in and never applied (PUBLIC, no profile) can be promoted
  // directly — a profile is created for them on the server.
  const canChangeRole =
    isAdmin &&
    !isArchived &&
    volunteer.user.id !== currentUserId &&
    (isAssignableRole(volunteer.user.role) || !volunteer.hasProfile);
  const roleOptions = ASSIGNABLE_ROLES.filter(
    (r) => r !== volunteer.user.role
  );

  if (isArchived) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Actions for ${volunteer.user.name || "volunteer"}`}
          >
            <RiMoreLine className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onRestore(volunteer)}>
            <RiArrowGoBackLine className="mr-2 size-4" />
            Restore account
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Volunteer-status changes only apply to people who have a profile. Someone
  // who never applied has no status to move between — promote them instead.
  const availableStatuses = !volunteer.hasProfile
    ? []
    : [
        { value: "ACTIVE", label: "Set active", icon: RiCheckLine },
        {
          value: "APPROVED_FOR_INDUCTION",
          label: "Approved for induction",
          icon: RiShieldCheckLine,
        },
        {
          value: "AWAITING_VETTING",
          label: "Awaiting vetting",
          icon: RiUserLine,
        },
        { value: "INACTIVE", label: "Set inactive", icon: RiUserLine },
      ].filter((s) => s.value !== volunteer.status);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Actions for ${volunteer.user.name || "volunteer"}`}
        >
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
        {canChangeRole && (
          <>
            {availableStatuses.length > 0 && <DropdownMenuSeparator />}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <RiUserSettingsLine className="mr-2 size-4" />
                Change role
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {roleOptions.map((role) => {
                  const Icon = ROLE_ICON[role];
                  return (
                    <DropdownMenuItem
                      key={role}
                      onClick={() => onChangeRole(volunteer, role)}
                    >
                      <Icon className="mr-2 size-4" />
                      Make {ROLE_LABEL[role].toLowerCase()}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onArchive(volunteer)}
          className="text-destructive focus:text-destructive"
        >
          <RiArchive2Line className="mr-2 size-4" />
          Archive account
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
