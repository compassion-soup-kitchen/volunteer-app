"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { DateOnly } from "@/lib/date-only";
import { LeaveForm } from "./leave-form";

/**
 * The volunteer's own "log leave" form, inline on their leave page. Starts
 * fresh after each save so the next stretch is a clean slate.
 */
export function LogLeaveForm({ today }: { today: DateOnly }) {
  const router = useRouter();
  const [round, setRound] = useState(0);

  return (
    <LeaveForm
      key={round}
      audience="volunteer"
      today={today}
      onSaved={() => {
        setRound((value) => value + 1);
        router.refresh();
      }}
    />
  );
}
