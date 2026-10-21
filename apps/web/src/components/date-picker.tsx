"use client";

import type { ComponentProps } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useFieldLabelId } from "@/components/ui/field";
import { RiCalendarLine } from "@remixicon/react";
import { cn } from "@/lib/utils";

interface DatePickerProps
  extends Pick<
    ComponentProps<"button">,
    "aria-invalid" | "aria-describedby" | "aria-required"
  > {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  /** Earliest selectable date */
  fromDate?: Date;
  /** Latest selectable date */
  toDate?: Date;
}

export function DatePicker({
  value,
  onChange,
  id,
  placeholder = "Pick a date",
  disabled,
  fromDate,
  toDate,
  // Not "aria-required": a button can't take it, so the field's label says so.
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: DatePickerProps) {
  // Inside a Field, name the button by its label *and* the chosen day, which
  // a `<label for>` alone would replace.
  const labelId = useFieldLabelId();
  const valueId = id ? `${id}-value` : undefined;

  // react-day-picker v10 removed `fromDate`/`toDate`. Translate our range into
  // navigation/dropdown bounds (`startMonth`/`endMonth`) plus `disabled`
  // matchers so out-of-range days stay visible but unselectable.
  const disabledMatchers = [
    ...(fromDate ? [{ before: fromDate }] : []),
    ...(toDate ? [{ after: toDate }] : []),
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          aria-labelledby={labelId && valueId ? `${labelId} ${valueId}` : undefined}
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedBy}
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground"
          )}
        >
          <RiCalendarLine className="size-4 text-muted-foreground" />
          <span id={valueId}>
            {value ? format(value, "d MMMM yyyy") : placeholder}
          </span>
        </Button>
      </PopoverTrigger>
      {/*
        Above `z-50`, which is where both the dialog surface and a default
        popover sit: inside a dialog the two tie, DOM order decides, and the
        dialog's own fields paint through the calendar.
      */}
      <PopoverContent className="z-60 w-auto p-0" align="start">
        <Calendar
          mode="single"
          captionLayout="dropdown"
          selected={value}
          onSelect={onChange}
          startMonth={fromDate}
          endMonth={toDate}
          disabled={disabledMatchers.length ? disabledMatchers : undefined}
          defaultMonth={value}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}
