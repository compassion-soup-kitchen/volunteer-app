"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RiLoader4Line } from "@remixicon/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  createOfflineVolunteer,
  updateOfflineVolunteer,
  type OfflineVolunteerValues,
} from "@/lib/offline-volunteer-actions";
import {
  OFFLINE_START_STATUS_LABELS,
  OFFLINE_START_STATUSES,
  type OfflineStartStatus,
} from "@/lib/offline-volunteer";
import { todayInAppZone } from "@/lib/date-only";

const MOJ_LABELS = {
  NOT_STARTED: "Not started",
  SUBMITTED: "Submitted, waiting to hear",
  CLEARED: "Cleared",
  FLAGGED: "Flagged",
} as const;
type MojStatus = keyof typeof MOJ_LABELS;

interface OfflineVolunteerFormProps {
  serviceAreas: { id: string; name: string }[];
  /** Present when editing an existing offline record. */
  values?: OfflineVolunteerValues;
}

const EMPTY = {
  name: "",
  email: "",
  phone: "",
  address: "",
  dateOfBirth: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  emergencyContactRelationship: "",
  bio: "",
};

type TextField = keyof typeof EMPTY;

/**
 * Adding, or keeping current, the record of someone who volunteers without
 * the app. Only a name is required - the paper forms they filled in can be
 * uploaded to their record afterwards.
 */
export function OfflineVolunteerForm({ serviceAreas, values }: OfflineVolunteerFormProps) {
  const router = useRouter();
  const isEdit = Boolean(values);
  const [isPending, startTransition] = useTransition();

  const [fields, setFields] = useState<Record<TextField, string>>(() =>
    values
      ? {
          name: values.name,
          email: values.email,
          phone: values.phone,
          address: values.address,
          dateOfBirth: values.dateOfBirth,
          emergencyContactName: values.emergencyContactName,
          emergencyContactPhone: values.emergencyContactPhone,
          emergencyContactRelationship: values.emergencyContactRelationship,
          bio: values.bio,
        }
      : EMPTY
  );
  const [areaIds, setAreaIds] = useState<string[]>(values?.serviceAreaIds ?? []);
  const [status, setStatus] = useState<OfflineStartStatus>("ACTIVE");
  const [mojStatus, setMojStatus] = useState<MojStatus>("NOT_STARTED");
  const [nameError, setNameError] = useState<string | null>(null);

  const set = (field: TextField) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setFields((current) => ({ ...current, [field]: event.target.value }));

  function toggleArea(id: string) {
    setAreaIds((current) =>
      current.includes(id) ? current.filter((a) => a !== id) : [...current, id]
    );
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (fields.name.trim().length < 2) {
      setNameError("Enter their full name.");
      return;
    }
    setNameError(null);

    startTransition(async () => {
      const details = { ...fields, serviceAreaIds: areaIds };
      const result = values
        ? await updateOfflineVolunteer(values.userId, details)
        : await createOfflineVolunteer({ ...details, status, mojStatus });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      const name = fields.name.trim();
      const userId =
        values?.userId ?? ("userId" in result ? result.userId : undefined);
      toast.success(isEdit ? `${name}'s details saved.` : `${name} added.`);
      router.push(userId ? `/staff/volunteers/${userId}` : "/staff/volunteers");
      router.refresh();
    });
  }

  return (
    <Card className="max-w-2xl">
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <section className="space-y-5">
            <h2 className="font-serif text-lg font-medium tracking-tight">
              Who they are
            </h2>

            <div className="space-y-2">
              <Label htmlFor="ov-name">Full name</Label>
              <Input
                id="ov-name"
                value={fields.name}
                onChange={set("name")}
                autoComplete="off"
                aria-invalid={nameError ? true : undefined}
                aria-describedby={nameError ? "ov-name-error" : undefined}
                disabled={isPending}
              />
              {nameError && (
                <p id="ov-name-error" className="text-sm text-destructive">
                  {nameError}
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ov-phone">Phone (optional)</Label>
                <Input
                  id="ov-phone"
                  type="tel"
                  value={fields.phone}
                  onChange={set("phone")}
                  autoComplete="off"
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ov-dob">Date of birth (optional)</Label>
                <Input
                  id="ov-dob"
                  type="date"
                  value={fields.dateOfBirth}
                  onChange={set("dateOfBirth")}
                  max={todayInAppZone()}
                  disabled={isPending}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ov-email">Email (optional)</Label>
              <Input
                id="ov-email"
                type="email"
                value={fields.email}
                onChange={set("email")}
                autoComplete="off"
                aria-describedby="ov-email-hint"
                disabled={isPending}
              />
              <p id="ov-email-hint" className="text-xs text-muted-foreground">
                Only if they have one. With an email on file they can start
                using the app later, by choosing &ldquo;Forgot password&rdquo;
                on the sign-in page.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ov-address">Address (optional)</Label>
              <Input
                id="ov-address"
                value={fields.address}
                onChange={set("address")}
                autoComplete="off"
                disabled={isPending}
              />
            </div>
          </section>

          <section className="space-y-5 border-t border-border pt-5">
            <h2 className="font-serif text-lg font-medium tracking-tight">
              Emergency contact
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ov-ec-name">Name</Label>
                <Input
                  id="ov-ec-name"
                  value={fields.emergencyContactName}
                  onChange={set("emergencyContactName")}
                  autoComplete="off"
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ov-ec-phone">Phone</Label>
                <Input
                  id="ov-ec-phone"
                  type="tel"
                  value={fields.emergencyContactPhone}
                  onChange={set("emergencyContactPhone")}
                  autoComplete="off"
                  disabled={isPending}
                />
              </div>
            </div>
            <div className="space-y-2 sm:max-w-[calc(50%-0.5rem)]">
              <Label htmlFor="ov-ec-rel">Relationship</Label>
              <Input
                id="ov-ec-rel"
                value={fields.emergencyContactRelationship}
                onChange={set("emergencyContactRelationship")}
                placeholder="Daughter, neighbour..."
                autoComplete="off"
                disabled={isPending}
              />
            </div>
          </section>

          <section className="space-y-4 border-t border-border pt-5">
            <div className="space-y-1">
              <h2 className="font-serif text-lg font-medium tracking-tight">
                Where they help
              </h2>
              <p className="text-sm text-muted-foreground">
                The service areas they&apos;re interested in.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {serviceAreas.map((area) => (
                <label
                  key={area.id}
                  className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 ring-1 ring-border transition-colors hover:bg-secondary/40 has-checked:bg-primary-tint has-checked:ring-primary/30"
                >
                  <Checkbox
                    checked={areaIds.includes(area.id)}
                    onCheckedChange={() => toggleArea(area.id)}
                    disabled={isPending}
                  />
                  <span className="text-sm font-medium">{area.name}</span>
                </label>
              ))}
            </div>
          </section>

          {!isEdit && (
            <section className="space-y-5 border-t border-border pt-5">
              <div className="space-y-1">
                <h2 className="font-serif text-lg font-medium tracking-tight">
                  Where they&apos;re at
                </h2>
                <p className="text-sm text-muted-foreground">
                  If their paperwork is already done, they can go straight on
                  the roster.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="ov-status">Status</Label>
                  <Select
                    value={status}
                    onValueChange={(value) => setStatus(value as OfflineStartStatus)}
                    disabled={isPending}
                  >
                    <SelectTrigger id="ov-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OFFLINE_START_STATUSES.map((value) => (
                        <SelectItem key={value} value={value}>
                          {OFFLINE_START_STATUS_LABELS[value]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ov-moj">MoJ vetting</Label>
                  <Select
                    value={mojStatus}
                    onValueChange={(value) => setMojStatus(value as MojStatus)}
                    disabled={isPending}
                  >
                    <SelectTrigger id="ov-moj">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(MOJ_LABELS) as MojStatus[]).map((value) => (
                        <SelectItem key={value} value={value}>
                          {MOJ_LABELS[value]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>
          )}

          <section className="space-y-2 border-t border-border pt-5">
            <Label htmlFor="ov-notes">Notes (optional)</Label>
            <Textarea
              id="ov-notes"
              value={fields.bio}
              onChange={set("bio")}
              rows={3}
              placeholder="Best way to reach them, the shift they always do..."
              disabled={isPending}
            />
            <p className="text-xs text-muted-foreground">
              Shown on their record - and on their own profile if they start
              using the app.
            </p>
          </section>

          <div className="flex gap-3 border-t border-border pt-5">
            <Button type="submit" disabled={isPending}>
              {isPending && <RiLoader4Line className="size-4 animate-spin" />}
              {isEdit ? "Save details" : "Add volunteer"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() =>
                router.push(
                  values ? `/staff/volunteers/${values.userId}` : "/staff/volunteers"
                )
              }
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
