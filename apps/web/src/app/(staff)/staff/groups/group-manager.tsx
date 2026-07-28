"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconChip } from "@/components/brand/icon-chip";
import { SectionHeader } from "@/components/brand/section-header";
import { GroupBadge } from "@/components/brand/group-badge";
import {
  RiAddLine,
  RiArchiveLine,
  RiDeleteBin6Line,
  RiEditLine,
  RiEyeLine,
  RiEyeOffLine,
  RiInboxUnarchiveLine,
  RiLoader4Line,
  RiMoreLine,
  RiSearchLine,
  RiUserAddLine,
  RiGroupLine,
} from "@remixicon/react";
import { toast } from "sonner";
import {
  createVolunteerGroup,
  deleteVolunteerGroup,
  getVolunteerGroups,
  setGroupMembers,
  toggleVolunteerGroupArchive,
  updateVolunteerGroup,
  type GroupCandidate,
  type VolunteerGroupWithCount,
} from "@/lib/group-actions";
import {
  GROUP_DESCRIPTION_MAX,
  GROUP_NAME_MAX,
  GROUP_TONES,
  memberCountLabel,
  validateGroupInput,
} from "@/lib/volunteer-groups";
import type { GroupTone } from "@prisma/client";

interface GroupManagerProps {
  initialGroups: VolunteerGroupWithCount[];
  candidates: GroupCandidate[];
}

export function GroupManager({ initialGroups, candidates }: GroupManagerProps) {
  const [groups, setGroups] = useState(initialGroups);
  const [, startTransition] = useTransition();

  // Create / edit dialog
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<VolunteerGroupWithCount | null>(
    null
  );
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tone, setTone] = useState<GroupTone>("BRAND");
  const [visibleToVolunteers, setVisibleToVolunteers] = useState(true);
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Members dialog
  const [memberTarget, setMemberTarget] =
    useState<VolunteerGroupWithCount | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [isSavingMembers, setIsSavingMembers] = useState(false);

  const [deleteTarget, setDeleteTarget] =
    useState<VolunteerGroupWithCount | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const candidatesById = useMemo(
    () => new Map(candidates.map((person) => [person.id, person])),
    [candidates]
  );

  function refresh() {
    startTransition(async () => {
      setGroups(await getVolunteerGroups());
    });
  }

  function openCreate() {
    setEditTarget(null);
    setName("");
    setDescription("");
    setTone("BRAND");
    setVisibleToVolunteers(true);
    setFormError("");
    setFormOpen(true);
  }

  function openEdit(group: VolunteerGroupWithCount) {
    setEditTarget(group);
    setName(group.name);
    setDescription(group.description ?? "");
    setTone(group.tone);
    setVisibleToVolunteers(group.visibleToVolunteers);
    setFormError("");
    setFormOpen(true);
  }

  function openMembers(group: VolunteerGroupWithCount) {
    setMemberTarget(group);
    setSelectedIds(group.memberIds);
    setMemberSearch("");
  }

  async function handleSave() {
    const input = { name, description, tone, visibleToVolunteers };
    const validated = validateGroupInput(input);
    if ("error" in validated) {
      setFormError(validated.error);
      return;
    }

    setIsSaving(true);
    setFormError("");
    const result = editTarget
      ? await updateVolunteerGroup(editTarget.id, input)
      : await createVolunteerGroup(input);
    setIsSaving(false);

    if (result.error) {
      setFormError(result.error);
      return;
    }

    toast.success(
      editTarget
        ? `${validated.data.name} updated.`
        : `${validated.data.name} created. Add people to it next.`
    );
    setFormOpen(false);
    refresh();
  }

  async function handleSaveMembers() {
    if (!memberTarget) return;
    setIsSavingMembers(true);
    const result = await setGroupMembers(memberTarget.id, selectedIds);
    setIsSavingMembers(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(result.message ?? "Members updated.");
    setMemberTarget(null);
    refresh();
  }

  async function handleToggleArchive(group: VolunteerGroupWithCount) {
    const result = await toggleVolunteerGroupArchive(group.id);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(
      result.isArchived
        ? `${group.name} archived. Nobody loses their history.`
        : `${group.name} restored.`
    );
    refresh();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const result = await deleteVolunteerGroup(deleteTarget.id);
    setIsDeleting(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(`${deleteTarget.name} deleted.`);
    setDeleteTarget(null);
    refresh();
  }

  const active = groups.filter((group) => !group.isArchived);
  const archived = groups.filter((group) => group.isArchived);

  const memberMatches = useMemo(() => {
    const needle = memberSearch.trim().toLowerCase();
    if (!needle) return candidates;
    return candidates.filter(
      (person) =>
        person.name.toLowerCase().includes(needle) ||
        person.email.toLowerCase().includes(needle)
    );
  }, [candidates, memberSearch]);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <RiAddLine className="size-4" />
          New group
        </Button>
      </div>

      <section className="space-y-4">
        <SectionHeader title={`Active (${active.length})`} />

        {active.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <IconChip tone="brand" size="lg">
                <RiGroupLine />
              </IconChip>
              <div>
                <p className="font-serif text-lg font-medium tracking-tight">
                  No groups yet
                </p>
                <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                  Groups put a name to the crews you already have - Team
                  Leaders, Guardian Angels, your Thursday regulars. They show
                  beside people&apos;s names across the app.
                </p>
              </div>
              <Button onClick={openCreate} variant="outline">
                <RiAddLine className="size-4" />
                Create the first group
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {active.map((group) => (
              <GroupCard
                key={group.id}
                group={group}
                candidatesById={candidatesById}
                onManageMembers={() => openMembers(group)}
                onEdit={() => openEdit(group)}
                onToggleArchive={() => handleToggleArchive(group)}
                onDelete={() => setDeleteTarget(group)}
              />
            ))}
          </div>
        )}
      </section>

      {archived.length > 0 && (
        <section className="space-y-4">
          <SectionHeader divider title={`Archived (${archived.length})`} />
          <div className="grid gap-4 sm:grid-cols-2">
            {archived.map((group) => (
              <GroupCard
                key={group.id}
                group={group}
                candidatesById={candidatesById}
                onManageMembers={() => openMembers(group)}
                onEdit={() => openEdit(group)}
                onToggleArchive={() => handleToggleArchive(group)}
                onDelete={() => setDeleteTarget(group)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Create / edit */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editTarget ? "Edit group" : "New group"}</DialogTitle>
            <DialogDescription>
              A group is a label, not a permission - it says who someone is to
              the team, and changes nothing about what they can do in the app.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="group-name">Name</Label>
              <Input
                id="group-name"
                value={name}
                maxLength={GROUP_NAME_MAX}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Team Leaders"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="group-description">Description (optional)</Label>
              <Textarea
                id="group-description"
                value={description}
                maxLength={GROUP_DESCRIPTION_MAX}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What this group does, or when to turn to them..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="group-tone">Badge colour</Label>
              <div className="flex items-center gap-3">
                <Select
                  value={tone}
                  onValueChange={(value) => setTone(value as GroupTone)}
                >
                  <SelectTrigger id="group-tone" className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GROUP_TONES.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <GroupBadge group={{ name: name.trim() || "Preview", tone }} />
              </div>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-lg bg-muted p-3">
              <Checkbox
                checked={visibleToVolunteers}
                onCheckedChange={(checked) =>
                  setVisibleToVolunteers(checked === true)
                }
                className="mt-0.5"
              />
              <span className="text-sm">
                <span className="font-medium">Volunteers can see this group</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Shows on the Our team page and on members&apos; own profiles,
                  so volunteers know who to turn to. Turn it off for a
                  staff-only list.
                </span>
              </span>
            </label>

            {formError && <p className="text-sm text-destructive">{formError}</p>}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFormOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <RiLoader4Line className="mr-2 size-4 animate-spin" />}
              {editTarget ? "Save changes" : "Create group"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Members */}
      <Dialog
        open={memberTarget !== null}
        onOpenChange={(open) => {
          if (!open && !isSavingMembers) setMemberTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Who&apos;s in {memberTarget?.name ?? "this group"}?
            </DialogTitle>
            <DialogDescription>
              Tick everyone who belongs. You can add or remove people any time.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <div className="relative">
              <RiSearchLine
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Search by name or email..."
                aria-label="Search people"
                className="pl-9"
              />
            </div>

            {memberMatches.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {candidates.length === 0
                  ? "No active volunteers yet."
                  : "No one matches that search."}
              </p>
            ) : (
              <ul className="max-h-72 overflow-y-auto rounded-lg ring-1 ring-border">
                {memberMatches.map((person) => {
                  const checked = selectedIds.includes(person.id);
                  return (
                    <li
                      key={person.id}
                      className="border-b border-border last:border-b-0"
                    >
                      <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors hover:bg-secondary/50 has-focus-visible:bg-secondary/50">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() =>
                            setSelectedIds((current) =>
                              checked
                                ? current.filter((id) => id !== person.id)
                                : [...current, person.id]
                            )
                          }
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">
                            {person.name}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {person.email}
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <DialogFooter className="sm:items-center sm:justify-between">
            <Badge variant="neutral" className="tnum">
              {selectedIds.length} selected
            </Badge>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setMemberTarget(null)}
                disabled={isSavingMembers}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveMembers} disabled={isSavingMembers}>
                {isSavingMembers && (
                  <RiLoader4Line className="mr-2 size-4 animate-spin" />
                )}
                Save members
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {deleteTarget?.name ?? "this group"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              The group and its{" "}
              {memberCountLabel(deleteTarget?._count.members ?? 0).toLowerCase()}{" "}
              membership disappears from the app. Nobody&apos;s account, hours,
              or history is affected - but you can&apos;t undo this. Archive
              instead if you might want it back.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
              disabled={isDeleting}
              variant="destructive"
            >
              {isDeleting && <RiLoader4Line className="mr-2 size-4 animate-spin" />}
              Delete group
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function GroupCard({
  group,
  candidatesById,
  onManageMembers,
  onEdit,
  onToggleArchive,
  onDelete,
}: {
  group: VolunteerGroupWithCount;
  candidatesById: Map<string, GroupCandidate>;
  onManageMembers: () => void;
  onEdit: () => void;
  onToggleArchive: () => void;
  onDelete: () => void;
}) {
  const names = group.memberIds
    .map((id) => candidatesById.get(id)?.name)
    .filter((name): name is string => Boolean(name));
  const shown = names.slice(0, 4);
  const hidden = names.length - shown.length;

  return (
    <Card className={group.isArchived ? "opacity-70" : undefined}>
      <CardContent className="flex h-full flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1.5">
            <GroupBadge group={group} />
            <p className="text-sm text-muted-foreground">
              {group.description || "No description yet."}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Actions for ${group.name}`}
              >
                <RiMoreLine className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <RiEditLine className="mr-2 size-4" />
                Edit details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onManageMembers}>
                <RiUserAddLine className="mr-2 size-4" />
                Manage members
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onToggleArchive}>
                {group.isArchived ? (
                  <>
                    <RiInboxUnarchiveLine className="mr-2 size-4" />
                    Restore
                  </>
                ) : (
                  <>
                    <RiArchiveLine className="mr-2 size-4" />
                    Archive
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onDelete}
                className="text-destructive focus:text-destructive"
              >
                <RiDeleteBin6Line className="mr-2 size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="neutral">{memberCountLabel(group._count.members)}</Badge>
          <Badge variant="outline" className="gap-1">
            {group.visibleToVolunteers ? (
              <>
                <RiEyeLine aria-hidden className="size-3.5" />
                Volunteers can see it
              </>
            ) : (
              <>
                <RiEyeOffLine aria-hidden className="size-3.5" />
                Staff only
              </>
            )}
          </Badge>
        </div>

        {shown.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {shown.join(", ")}
            {hidden > 0 && ` and ${hidden} more`}
          </p>
        )}

        <Button
          variant="outline"
          size="sm"
          className="mt-auto w-full"
          onClick={onManageMembers}
        >
          <RiUserAddLine className="size-4" />
          Manage members
        </Button>
      </CardContent>
    </Card>
  );
}
