import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getAvailableTraining } from "@/lib/training-actions";
import { TrainingBrowser } from "./training-browser";
import { PageHeader } from "@/components/brand/page-header";

export const metadata: Metadata = {
  title: "Training | Te Pūaroha",
};

function TrainingSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-32 w-full " />
      ))}
    </div>
  );
}

async function TrainingContent() {
  const sessions = await getAvailableTraining();
  return <TrainingBrowser sessions={sessions} />;
}

export default function VolunteerTrainingPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-24">
      <PageHeader
        backHref="/dashboard"
        eyebrow="Whakangungu · Training"
        title="Training"
        description="Browse and register for upcoming training sessions"
      />
      <Suspense fallback={<TrainingSkeleton />}>
        <TrainingContent />
      </Suspense>
    </div>
  );
}
