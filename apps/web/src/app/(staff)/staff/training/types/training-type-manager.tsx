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
import { TrainingTypeBadge } from "@/components/brand/training-type-badge";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  RiAddLine,
  RiArchiveLine,
  RiDeleteBinLine,
  RiEditLine,
  RiGraduationCapLine,
  RiInboxUnarchiveLine,
  RiLoader4Line,
  RiMoreLine,
} from "@remixicon/react";
import { toast } from "sonner";
import {
  createTrainingType,
  deleteTrainingType,
  getTrainingTypesWithStats,
  toggleTrainingTypeArchive,
  updateTrainingType,
  type TrainingTypeWithStats,
} from "@/lib/training-type-actions";
import {
  TRAINING_TYPE_DESCRIPTION_MAX,
  TRAINING_TYPE_NAME_MAX,
} from "@/lib/training-types";

interface TrainingTypeManagerProps {
  initialTypes: TrainingTypeWithStats[];
}

export function TrainingTypeManager({ initialTypes }: TrainingTypeManagerProps) {
  const [types, setTypes] = useState(initialTypes);
  const [, startTransition] = useTransition();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TrainingTypeWithStats | null>(
    null
  );
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dialogError, setDialogError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TrainingTypeWithStats | null>(
    null
  );

  function refresh() {
    startTransition(async () => {
      setTypes(await getTrainingTypesWithStats());
    });
  }

  function openCreate() {
    setEditTarget(null);
    setName("");
    setDescription("");
    setDialogError("");
    setDialogOpen(true);
  }

  function openEdit(type: TrainingTypeWithStats) {
    setEditTarget(type);
    setName(type.name);
    setDescription(type.description ?? "");
    setDialogError("");
    setDialogOpen(true);
  }

  async function handleSave() {
    setIsSaving(true);
    setDialogError("");

    const payload = { name, description };
    const result = editTarget
      ? await updateTrainingType(editTarget.id, payload)
      : await createTrainingType(payload);

    setIsSaving(false);
    if (result.error) {
      setDialogError(result.error);
      return;
    }

    toast.success(
      editTarget ? "Training type updated." : "Training type created."
    );
    setDialogOpen(false);
    refresh();
  }

  async function handleToggleArchive(type: TrainingTypeWithStats) {
    const result = await toggleTrainingTypeArchive(type.id);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(
      type.isArchived ? `${type.name} restored.` : `${type.name} archived.`
    );
    refresh();
  }

  async function handleDelete(type: TrainingTypeWithStats) {
    const result = await deleteTrainingType(type.id);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(`${type.name} deleted.`);
    refresh();
  }

  const active = types.filter((t) => !t.isArchived);
  const archived = types.filter((t) => t.isArchived);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <RiAddLine className="size-4" />
          New training type
        </Button>
      </div>

      <section className="space-y-4">
        <SectionHeader
          eyebrow="Kei te mahi"
          title={`Active (${active.length})`}
        />
        {active.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <IconChip tone="brand" size="lg">
                <RiGraduationCapLine />
              </IconChip>
              <div>
                <p className="font-serif text-lg font-medium tracking-tight">
                  No training types yet
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add one so sessions can be scheduled against it.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <ul className="divide-y divide-border">
              {active.map((type) => (
                <TypeRow
                  key={type.id}
                  type={type}
                  onEdit={() => openEdit(type)}
                  onToggleArchive={() => handleToggleArchive(type)}
                  onDelete={() => setDeleteTarget(type)}
                />
              ))}
            </ul>
          </Card>
        )}
      </section>

      {archived.length > 0 && (
        <section className="space-y-4">
          <SectionHeader
            divider
            eyebrow="Kua pūranga"
            title={`Archived (${archived.length})`}
          />
          <Card>
            <ul className="divide-y divide-border">
              {archived.map((type) => (
                <TypeRow
                  key={type.id}
                  type={type}
                  onEdit={() => openEdit(type)}
                  onToggleArchive={() => handleToggleArchive(type)}
                  onDelete={() => setDeleteTarget(type)}
                />
              ))}
            </ul>
          </Card>
        </section>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editTarget ? "Edit training type" : "New training type"}
            </DialogTitle>
            <DialogDescription>
              {editTarget
                ? "Renaming updates this type everywhere it appears, including on sessions already run."
                : "Training types group your sessions — induction, food safety, whatever your kaupapa needs."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="type-name">Name</Label>
              <Input
                id="type-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={TRAINING_TYPE_NAME_MAX}
                placeholder="e.g. Food safety"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type-desc">Description (optional)</Label>
              <Textarea
                id="type-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={TRAINING_TYPE_DESCRIPTION_MAX}
                placeholder="What this training covers..."
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
              {isSaving && <RiLoader4Line className="mr-2 size-4 animate-spin" />}
              {editTarget ? "Save changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this training type?</AlertDialogTitle>
            <AlertDialogDescription>
              {`"${deleteTarget?.name}" will be removed for good. This can't be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (deleteTarget) handleDelete(deleteTarget);
                setDeleteTarget(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TypeRow({
  type,
  onEdit,
  onToggleArchive,
  onDelete,
}: {
  type: TrainingTypeWithStats;
  onEdit: () => void;
  onToggleArchive: () => void;
  onDelete: () => void;
}) {
  // Built-in types and types with history can't be deleted — the action says so
  // too, but hiding the item avoids offering something that always fails.
  const canDelete = !type.isSeeded && type.sessionCount === 0;

  const caption =
    type.description ??
    `${type.sessionCount} ${type.sessionCount === 1 ? "session" : "sessions"}`;

  return (
    <li className="flex items-center gap-3 px-5 py-3.5">
      <IconChip
        tone={type.isArchived ? "neutral" : "brand"}
        className={type.isArchived ? "opacity-60" : undefined}
      >
        <RiGraduationCapLine />
      </IconChip>
      <div className={`min-w-0 flex-1 ${type.isArchived ? "opacity-60" : ""}`}>
        <div className="flex flex-wrap items-center gap-2">
          <TrainingTypeBadge type={type} />
          {type.isSeeded && (
            <Badge variant="outline" className="hidden sm:inline-flex">
              Built-in
            </Badge>
          )}
        </div>
        <p className="mt-1 truncate text-xs text-muted-foreground">{caption}</p>
      </div>
      <Badge variant="neutral" className="hidden shrink-0 sm:inline-flex">
        {type.sessionCount} {type.sessionCount === 1 ? "session" : "sessions"}
      </Badge>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Actions for ${type.name}`}
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
            {type.isArchived ? (
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
          {canDelete && (
            <DropdownMenuItem variant="destructive" onClick={onDelete}>
              <RiDeleteBinLine className="mr-2 size-4" />
              Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}
