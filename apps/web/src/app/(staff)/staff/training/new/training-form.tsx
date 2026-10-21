"use client";

import { useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldControl,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { DatePicker } from "@/components/date-picker";
import { RiLoader4Line } from "@remixicon/react";
import { toast } from "sonner";
import { toDateOnly } from "@/lib/date-only";
import { createTrainingSession, type CreateTrainingData } from "@/lib/training-actions";
import type { TrainingTypeOption } from "@/lib/training-type-actions";

export function TrainingForm({
  trainingTypes,
}: {
  trainingTypes: TrainingTypeOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [typeId, setTypeId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [capacity, setCapacity] = useState("15");
  const [location, setLocation] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    if (!typeId) newErrors.type = "Please select a training type.";
    if (!title.trim()) newErrors.title = "Title is required.";
    if (!date) newErrors.date = "Please select a date.";
    if (!startTime) newErrors.startTime = "Start time is required.";
    if (!endTime) newErrors.endTime = "End time is required.";
    if (startTime && endTime && startTime >= endTime) {
      newErrors.endTime = "End time must be after start time.";
    }
    const cap = parseInt(capacity, 10);
    if (isNaN(cap) || cap < 1) {
      newErrors.capacity = "Capacity must be at least 1.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate()) return;

    startTransition(async () => {
      const data: CreateTrainingData = {
        typeId,
        title: title.trim(),
        description: description.trim() || undefined,
        date: toDateOnly(date!),
        startTime,
        endTime,
        capacity: parseInt(capacity, 10),
        location: location.trim() || undefined,
      };

      const result = await createTrainingSession(data);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Training session created.");
        router.push("/staff/training");
      }
    });
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  return (
    <Card className="max-w-xl">
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <section className="space-y-5">
            <h2 className="font-serif text-lg font-medium tracking-tight">
              About the session
            </h2>

            {/* Type */}
            <Field id="type" error={errors.type}>
              <div className="flex items-baseline justify-between gap-3">
                <FieldLabel>Training type</FieldLabel>
                <Link
                  href="/staff/training/types"
                  className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  Manage types
                </Link>
              </div>
              <Select
                value={typeId}
                onValueChange={setTypeId}
                disabled={trainingTypes.length === 0}
              >
                <FieldControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                </FieldControl>
                <SelectContent>
                  {trainingTypes.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {trainingTypes.length === 0 && (
                <FieldDescription className="text-sm">
                  No training types yet -{" "}
                  <Link
                    href="/staff/training/types"
                    className="font-medium text-foreground underline underline-offset-4"
                  >
                    add one first
                  </Link>
                  .
                </FieldDescription>
              )}
              <FieldError />
            </Field>

            {/* Title */}
            <Field id="title" error={errors.title}>
              <FieldLabel>Title</FieldLabel>
              <FieldControl>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. New Volunteer Induction"
                />
              </FieldControl>
              <FieldError />
            </Field>

            {/* Description */}
            <Field id="description">
              <FieldLabel>Description (optional)</FieldLabel>
              <FieldControl>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What will be covered in this session…"
                  rows={3}
                />
              </FieldControl>
            </Field>
          </section>

          <section className="space-y-5 border-t border-border pt-5">
            <h2 className="font-serif text-lg font-medium tracking-tight">
              When and where
            </h2>

            {/* Date */}
            <Field id="date" error={errors.date}>
              <FieldLabel>Date</FieldLabel>
              <FieldControl>
                <DatePicker
                  value={date}
                  onChange={setDate}
                  placeholder="Select a date"
                  fromDate={tomorrow}
                />
              </FieldControl>
              <FieldError />
            </Field>

            {/* Times */}
            <div className="grid grid-cols-2 gap-4">
              <Field id="startTime" error={errors.startTime}>
                <FieldLabel>Start time</FieldLabel>
                <FieldControl>
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </FieldControl>
                <FieldError />
              </Field>
              <Field id="endTime" error={errors.endTime}>
                <FieldLabel>End time</FieldLabel>
                <FieldControl>
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </FieldControl>
                <FieldError />
              </Field>
            </div>

            {/* Capacity */}
            <Field id="capacity" error={errors.capacity}>
              <FieldLabel>Capacity</FieldLabel>
              <FieldControl>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  className="w-24"
                />
              </FieldControl>
              <FieldError />
              <FieldDescription>
                Maximum number of volunteers for this session
              </FieldDescription>
            </Field>

            {/* Location */}
            <Field id="location">
              <FieldLabel>Location (optional)</FieldLabel>
              <FieldControl>
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Community Hall, Level 1"
                />
              </FieldControl>
            </Field>
          </section>

          {/* Submit */}
          <div className="flex gap-3 border-t border-border pt-5">
            <Button type="submit" disabled={isPending}>
              {isPending && (
                <RiLoader4Line className="size-4 animate-spin" />
              )}
              Create session
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/staff/training")}
              disabled={isPending}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
