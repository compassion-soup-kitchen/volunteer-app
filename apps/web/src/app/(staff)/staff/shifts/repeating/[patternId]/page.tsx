import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/brand/page-header";
import { getVolunteerOptions } from "@/lib/shift-actions";
import { getShiftPattern } from "@/lib/shift-pattern-actions";
import { describeRecurrence } from "@/lib/shift-patterns";
import { formatTimeRange } from "@/lib/format";
import { PatternEditor } from "./pattern-editor";

export const metadata: Metadata = {
  title: "Repeating shift | Te Pūaroha",
};

export default async function RepeatingShiftPage(props: {
  params: Promise<{ patternId: string }>;
}) {
  const { patternId } = await props.params;
  const [pattern, volunteers] = await Promise.all([
    getShiftPattern(patternId),
    getVolunteerOptions(),
  ]);
  if (!pattern) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        backHref="/staff/shifts/repeating"
        eyebrow="Mahi auau · Repeating"
        title={pattern.serviceArea.name}
        description={`${describeRecurrence(pattern.weekdays, pattern.interval)}, ${formatTimeRange(pattern.startTime, pattern.endTime)}`}
      />

      <PatternEditor pattern={pattern} volunteers={volunteers} />
    </div>
  );
}
