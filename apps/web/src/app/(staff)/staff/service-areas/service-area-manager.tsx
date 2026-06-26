"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  RiCalendarLine,
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
          New Service Area
        </Button>
      </div>

      {/* Active areas */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">
          Active ({active.length})
        </h2>

        {active.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <RiMapPinLine className="mx-auto mb-3 size-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                No service areas yet. Create one to get started.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {active.map((area) => (
              <AreaCard
                key={area.id}
                area={area}
                onEdit={() => openEdit(area)}
                onToggleArchive={() => handleToggleArchive(area)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Archived areas */}
      {archived.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Archived ({archived.length})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {archived.map((area) => (
              <AreaCard
                key={area.id}
                area={area}
                onEdit={() => openEdit(area)}
                onToggleArchive={() => handleToggleArchive(area)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editTarget ? "Edit Service Area" : "New Service Area"}
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
              {editTarget ? "Save Changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AreaCard({
  area,
  onEdit,
  onToggleArchive,
}: {
  area: ServiceAreaWithStats;
  onEdit: () => void;
  onToggleArchive: () => void;
}) {
  return (
    <Card className={area.isArchived ? "opacity-60" : undefined}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-base">
              {area.name}
              {area.isArchived && (
                <Badge variant="secondary" className="text-[10px]">
                  Archived
                </Badge>
              )}
            </CardTitle>
            {area.description && (
              <CardDescription className="mt-1 line-clamp-2">
                {area.description}
              </CardDescription>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm">
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
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <RiCalendarLine className="size-3.5" />
            {area._count.shifts} shift{area._count.shifts !== 1 ? "s" : ""}
          </span>
          <span className="flex items-center gap-1">
            <RiTeamLine className="size-3.5" />
            {area._count.volunteers} interested
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
