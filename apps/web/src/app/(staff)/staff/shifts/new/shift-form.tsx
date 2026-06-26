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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DatePicker } from "@/components/date-picker";
import {
  RiLoader4Line,
  RiCalendarLine,
} from "@remixicon/react";
import { toast } from "sonner";
import { createShift, type CreateShiftData } from "@/lib/shift-actions";

interface ShiftFormProps {
  serviceAreas: { id: string; name: string }[];
}

export function ShiftForm({ serviceAreas }: ShiftFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [serviceAreaId, setServiceAreaId] = useState("");
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [capacity, setCapacity] = useState("6");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    if (!serviceAreaId) newErrors.serviceAreaId = "Please select a service area.";
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
      const data: CreateShiftData = {
        serviceAreaId,
        date: date!.toISOString(),
        startTime,
        endTime,
        capacity: parseInt(capacity, 10),
        notes: notes.trim() || undefined,
      };

      const result = await createShift(data);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Shift created successfully.");
        router.push("/staff/shifts");
      }
    });
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RiCalendarLine className="size-5 text-primary" />
          Shift Details
        </CardTitle>
        <CardDescription>
          Fill in the details for the new shift
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Service Area */}
        <div className="space-y-2">
          <Label htmlFor="serviceArea">Service Area</Label>
          <Select value={serviceAreaId} onValueChange={setServiceAreaId}>
            <SelectTrigger id="serviceArea">
              <SelectValue placeholder="Select a service area" />
            </SelectTrigger>
            <SelectContent>
              {serviceAreas.map((area) => (
                <SelectItem key={area.id} value={area.id}>
                  {area.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.serviceAreaId && (
            <p className="text-sm text-destructive">{errors.serviceAreaId}</p>
          )}
        </div>

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
            <Label htmlFor="startTime">Start Time</Label>
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
            <Label htmlFor="endTime">End Time</Label>
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
            max="50"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            className="w-24"
          />
          {errors.capacity && (
            <p className="text-sm text-destructive">{errors.capacity}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Maximum number of volunteers for this shift
          </p>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Notes (optional)</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any details volunteers should know..."
            rows={3}
          />
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending && (
              <RiLoader4Line className="mr-2 size-4 animate-spin" />
            )}
            Create Shift
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push("/staff/shifts")}
            disabled={isPending}
          >
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
