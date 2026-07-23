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
const ROLE_BADGE_VARIANT: Partial<
  Record<string, "default" | "secondary" | "destructive" | "outline">
> = {
  COORDINATOR: "secondary",
  ADMIN: "default",
};

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
                    <TableRow
                      key={vol.id}
                      className={vol.user.status === "ARCHIVED" ? "opacity-60" : ""}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2 font-medium">
                          {vol.user.name || "Unnamed"}
                          {ROLE_BADGE_VARIANT[vol.user.role] && (
                            <Badge
                              variant={ROLE_BADGE_VARIANT[vol.user.role]}
                              className="text-[10px]"
                            >
                              {ROLE_LABEL[vol.user.role as AssignableRole] ??
                                vol.user.role}
                            </Badge>
                          )}
                          {vol.user.status === "ARCHIVED" && (
                            <Badge variant="outline" className="text-[10px]">
                              Archived
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {vol.user.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        {vol.hasProfile && vol.status ? (
                          <Badge
                            variant={
                              STATUS_BADGE_VARIANT[vol.status] || "secondary"
                            }
                          >
                            {STATUS_LABEL[vol.status] || vol.status}
                          </Badge>
                        ) : (
                          <Badge variant="outline">No application yet</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {vol.hasProfile && vol.mojStatus ? (
                          <Badge
                            variant={
                              MOJ_BADGE_VARIANT[vol.mojStatus] || "secondary"
                            }
                          >
                            {MOJ_LABEL[vol.mojStatus] || vol.mojStatus}
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            —
                          </span>
                        )}
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
                      <TableCell className="tabular-nums text-sm" style={{ textAlign: "right" }}>
                        {vol._count.shiftSignups}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground" style={{ textAlign: "right" }}>
                        {format(vol.createdAt, "d MMM yy")}
                      </TableCell>
                      <TableCell>
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

          {/* Mobile cards */}
          <div className="space-y-3 sm:hidden">
            {volunteers.map((vol) => (
              <Card
                key={vol.id}
                className={vol.user.status === "ARCHIVED" ? "opacity-60" : ""}
              >
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">
                          {vol.user.name || "Unnamed"}
                        </p>
                        {ROLE_BADGE_VARIANT[vol.user.role] && (
                          <Badge
                            variant={ROLE_BADGE_VARIANT[vol.user.role]}
                            className="text-[10px]"
                          >
                            {ROLE_LABEL[vol.user.role as AssignableRole] ??
                              vol.user.role}
                          </Badge>
                        )}
                        {vol.user.status === "ARCHIVED" && (
                          <Badge variant="outline" className="text-[10px]">
                            Archived
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {vol.user.email}
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
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {vol.hasProfile && vol.status ? (
                      <>
                        <Badge
                          variant={
                            STATUS_BADGE_VARIANT[vol.status] || "secondary"
                          }
                        >
                          {STATUS_LABEL[vol.status] || vol.status}
                        </Badge>
                        {vol.mojStatus && (
                          <Badge
                            variant={
                              MOJ_BADGE_VARIANT[vol.mojStatus] || "secondary"
                            }
                          >
                            MOJ: {MOJ_LABEL[vol.mojStatus] || vol.mojStatus}
                          </Badge>
                        )}
                      </>
                    ) : (
                      <Badge variant="outline">No application yet</Badge>
                    )}
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
                    <span className="tabular-nums">{vol._count.shiftSignups} shifts</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
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
                roleTarget && `Make ${ROLE_LABEL[roleTarget.newRole]}`
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
          <Button variant="ghost" size="icon-sm">
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
        { value: "ACTIVE", label: "Set Active", icon: RiCheckLine },
        {
          value: "APPROVED_FOR_INDUCTION",
          label: "Approved for Induction",
          icon: RiShieldCheckLine,
        },
        {
          value: "AWAITING_VETTING",
          label: "Awaiting Vetting",
          icon: RiUserLine,
        },
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
                      Make {ROLE_LABEL[role]}
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
