"use client";

import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RiCalendarLine } from "@remixicon/react";
import { cn } from "@/lib/utils";

interface DatePickerProps {
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
}: DatePickerProps) {
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
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground"
          )}
        >
          <RiCalendarLine className="size-4 text-muted-foreground" />
          {value ? format(value, "d MMMM yyyy") : placeholder}
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
