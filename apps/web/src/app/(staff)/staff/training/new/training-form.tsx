"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const TRAINING_TYPES = [
  { value: "INDUCTION", label: "Induction" },
  { value: "DE_ESCALATION", label: "De-escalation" },
  { value: "HEALTH_SAFETY", label: "Health & Safety" },
  { value: "OTHER", label: "Other" },
];

export function TrainingForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [type, setType] = useState("");
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

    if (!type) newErrors.type = "Please select a training type.";
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

  function handleSubmit() {
    if (!validate()) return;

    startTransition(async () => {
      const data: CreateTrainingData = {
        type,
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
      <CardContent className="space-y-6">
        <section className="space-y-5">
          <h2 className="font-serif text-lg font-medium tracking-tight">
            About the session
          </h2>

          {/* Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Training type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="type">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {TRAINING_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type && (
              <p className="text-sm text-destructive">{errors.type}</p>
            )}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. New Volunteer Induction"
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What will be covered in this session..."
              rows={3}
            />
          </div>
        </section>

        <section className="space-y-5 border-t border-border pt-5">
          <h2 className="font-serif text-lg font-medium tracking-tight">
            When and where
          </h2>

          {/* Date */}
          <div className="space-y-2">
            <Label>Date</Label>
            <DatePicker
              value={date}
              onChange={setDate}
              placeholder="Select a date"
              fromDate={tomorrow}
            />
            {errors.date && (
              <p className="text-sm text-destructive">{errors.date}</p>
            )}
          </div>

          {/* Times */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start time</Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
              {errors.startTime && (
                <p className="text-sm text-destructive">{errors.startTime}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">End time</Label>
              <Input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
              {errors.endTime && (
                <p className="text-sm text-destructive">{errors.endTime}</p>
              )}
            </div>
          </div>

          {/* Capacity */}
          <div className="space-y-2">
            <Label htmlFor="capacity">Capacity</Label>
            <Input
              id="capacity"
              type="number"
              min="1"
              max="100"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              className="w-24"
            />
            {errors.capacity && (
              <p className="text-sm text-destructive">{errors.capacity}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Maximum number of volunteers for this session
            </p>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Location (optional)</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Community Hall, Level 1"
            />
          </div>
        </section>

        {/* Submit */}
        <div className="flex gap-3 border-t border-border pt-5">
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending && (
              <RiLoader4Line className="size-4 animate-spin" />
            )}
            Create session
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push("/staff/training")}
            disabled={isPending}
          >
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
