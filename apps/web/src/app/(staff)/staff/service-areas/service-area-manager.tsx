"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { IconChip } from "@/components/brand/icon-chip";
import { SectionHeader } from "@/components/brand/section-header";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  RiAddLine,
  RiEditLine,
  RiArchiveLine,
  RiInboxUnarchiveLine,
  RiMoreLine,
  RiLoader4Line,
  RiMapPinLine,
  RiTeamLine,
} from "@remixicon/react";
import { toast } from "sonner";
import {
  createServiceArea,
  updateServiceArea,
  toggleServiceAreaArchive,
  getServiceAreasWithStats,
  type ServiceAreaWithStats,
} from "@/lib/service-area-actions";

interface ServiceAreaManagerProps {
  initialAreas: ServiceAreaWithStats[];
}

export function ServiceAreaManager({ initialAreas }: ServiceAreaManagerProps) {
  const [areas, setAreas] = useState(initialAreas);
  const [, startTransition] = useTransition();

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ServiceAreaWithStats | null>(
    null
  );
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dialogError, setDialogError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  function openCreate() {
    setEditTarget(null);
    setName("");
    setDescription("");
    setDialogError("");
    setDialogOpen(true);
  }

  function openEdit(area: ServiceAreaWithStats) {
    setEditTarget(area);
    setName(area.name);
    setDescription(area.description || "");
    setDialogError("");
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!name.trim()) {
      setDialogError("Name is required.");
      return;
    }

    setIsSaving(true);
    setDialogError("");

    const result = editTarget
      ? await updateServiceArea(editTarget.id, {
          name: name.trim(),
          description: description.trim(),
        })
      : await createServiceArea({
          name: name.trim(),
          description: description.trim(),
        });

    if (result.error) {
      setDialogError(result.error);
      setIsSaving(false);
      return;
    }

    toast.success(
      editTarget ? "Service area updated." : "Service area created."
    );
    setDialogOpen(false);
    setIsSaving(false);

    // Refresh list
    startTransition(async () => {
      const refreshed = await getServiceAreasWithStats();
      setAreas(refreshed);
    });
  }

  async function handleToggleArchive(area: ServiceAreaWithStats) {
    const result = await toggleServiceAreaArchive(area.id);
    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success(
      area.isArchived
        ? `${area.name} restored.`
        : `${area.name} archived.`
    );

    startTransition(async () => {
      const refreshed = await getServiceAreasWithStats();
      setAreas(refreshed);
    });
  }

  const active = areas.filter((a) => !a.isArchived);
  const archived = areas.filter((a) => a.isArchived);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <RiAddLine className="size-4" />
          New service area
        </Button>
      </div>

      {/* Active areas */}
      <section className="space-y-4">
        <SectionHeader title={`Active (${active.length})`} />

        {active.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <IconChip tone="brand" size="lg">
                <RiMapPinLine />
              </IconChip>
              <div>
                <p className="font-serif text-lg font-medium tracking-tight">
                  No service areas yet
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create one to get started.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <ul className="divide-y divide-border">
              {active.map((area) => (
                <AreaRow
                  key={area.id}
                  area={area}
                  onEdit={() => openEdit(area)}
                  onToggleArchive={() => handleToggleArchive(area)}
                />
              ))}
            </ul>
          </Card>
        )}
      </section>

      {/* Archived areas */}
      {archived.length > 0 && (
        <section className="space-y-4">
          <SectionHeader divider title={`Archived (${archived.length})`} />
          <Card>
            <ul className="divide-y divide-border">
              {archived.map((area) => (
                <AreaRow
                  key={area.id}
                  area={area}
                  onEdit={() => openEdit(area)}
                  onToggleArchive={() => handleToggleArchive(area)}
                />
              ))}
            </ul>
          </Card>
        </section>
      )}

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editTarget ? "Edit service area" : "New service area"}
            </DialogTitle>
            <DialogDescription>
              {editTarget
                ? "Update the details for this service area."
                : "Add a new kaupapa area for volunteers."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="area-name">Name</Label>
              <Input
                id="area-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Kitchen & Meals"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="area-desc">Description (optional)</Label>
              <Textarea
                id="area-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What volunteers do in this area..."
                rows={3}
              />
            </div>
            {dialogError && (
              <p className="text-sm text-destructive">{dialogError}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && (
                <RiLoader4Line className="mr-2 size-4 animate-spin" />
              )}
              {editTarget ? "Save changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AreaRow({
  area,
  onEdit,
  onToggleArchive,
}: {
  area: ServiceAreaWithStats;
  onEdit: () => void;
  onToggleArchive: () => void;
}) {
  const caption = [
    area.description,
    `${area._count.shifts} ${area._count.shifts === 1 ? "shift" : "shifts"}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="flex items-center gap-3 px-5 py-3.5">
      <IconChip
        tone={area.isArchived ? "neutral" : "brand"}
        className={area.isArchived ? "opacity-60" : undefined}
      >
        <RiMapPinLine />
      </IconChip>
      <div className={`min-w-0 flex-1 ${area.isArchived ? "opacity-60" : ""}`}>
        <p className="truncate font-serif text-base font-medium tracking-tight">
          {area.name}
        </p>
        <p className="truncate text-xs text-muted-foreground">{caption}</p>
      </div>
      <Badge variant="neutral" className="hidden sm:inline-flex">
        <RiTeamLine />
        {area._count.volunteers} interested
      </Badge>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Actions for ${area.name}`}
          >
            <RiMoreLine className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit}>
            <RiEditLine className="mr-2 size-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onToggleArchive}>
            {area.isArchived ? (
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
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}
