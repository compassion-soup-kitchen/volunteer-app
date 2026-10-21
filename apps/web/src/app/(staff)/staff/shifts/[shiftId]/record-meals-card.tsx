"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field, FieldControl, FieldError, FieldLabel } from "@/components/ui/field";
import { StatFigure } from "@/components/brand/stat-figure";
import { IconChip } from "@/components/brand/icon-chip";
import { RiLoader4Line, RiRestaurantLine } from "@remixicon/react";
import { toast } from "sonner";
import { recordShiftMeals } from "@/lib/shift-actions";
import { MEALS_SERVED_MAX, mealsServedSchema } from "@/lib/shift-meals";
import { Eyebrow } from "@/components/brand/eyebrow";
import { formatTimestampWithTime } from "@/lib/format";

interface RecordMealsCardProps {
  shiftId: string;
  mealsServed: number | null;
  mealsRecordedAt: Date | null;
  mealsRecordedByName: string | null;
}

export function RecordMealsCard({
  shiftId,
  mealsServed,
  mealsRecordedAt,
  mealsRecordedByName,
}: RecordMealsCardProps) {
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(
    mealsServed != null ? String(mealsServed) : ""
  );
  const [error, setError] = useState<string | null>(null);
  const hasRecorded = mealsServed != null;

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const count = value.trim() === "" ? NaN : Number(value);
    const parsed = mealsServedSchema.safeParse(count);
    if (!parsed.success) {
      setError(`Please enter a whole number between 0 and ${MEALS_SERVED_MAX}.`);
      return;
    }
    setError(null);

    startTransition(async () => {
      const result = await recordShiftMeals(shiftId, parsed.data);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(
          `Ka pai! ${parsed.data} ${parsed.data === 1 ? "meal" : "meals"} recorded.`
        );
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Kai served</CardTitle>
        <CardDescription>
          Meals shared with the community on this shift
        </CardDescription>
        <CardAction>
          <IconChip tone="brand" size="sm">
            <RiRestaurantLine />
          </IconChip>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasRecorded && (
          <div className="rounded-lg bg-muted p-4">
            <Eyebrow size="sm" tone="muted">
              Meals shared
            </Eyebrow>
            <StatFigure
              value={mealsServed}
              unit={mealsServed === 1 ? "meal" : "meals"}
              className="mt-1.5"
            />
            {(mealsRecordedByName || mealsRecordedAt) && (
              <p className="mt-1.5 text-xs text-muted-foreground">
                {mealsRecordedByName
                  ? `Recorded by ${mealsRecordedByName}`
                  : "Recorded"}
                {mealsRecordedAt &&
                  `${mealsRecordedByName ? " ·" : ""} ${formatTimestampWithTime(mealsRecordedAt)}`}
              </p>
            )}
          </div>
        )}

        <form onSubmit={handleSave} noValidate>
          <Field id="meals-served" error={error}>
            <FieldLabel>
              {hasRecorded ? "Update the count" : "How many meals went out?"}
            </FieldLabel>
            <div className="flex gap-2">
              <FieldControl>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={MEALS_SERVED_MAX}
                  step={1}
                  placeholder="e.g. 120"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  disabled={isPending}
                />
              </FieldControl>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <RiLoader4Line className="size-4 animate-spin" />
                ) : null}
                {hasRecorded ? "Update" : "Save"}
              </Button>
            </div>
            <FieldError />
          </Field>
        </form>
      </CardContent>
    </Card>
  );
}
