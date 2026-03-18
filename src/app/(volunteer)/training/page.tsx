import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RiArrowLeftLine } from "@remixicon/react";
import { getAvailableTraining } from "@/lib/training-actions";
import { TrainingBrowser } from "./training-browser";

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
      <div className="flex items-center gap-3">
        <div className="hidden sm:block">
          <Button variant="ghost" size="icon-sm" asChild>
            <Link href="/dashboard">
              <RiArrowLeftLine className="size-4" />
            </Link>
          </Button>
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Whakangungu — Training
          </h1>
          <p className="text-muted-foreground">
            Browse and register for upcoming training sessions
          </p>
        </div>
      </div>
      <Suspense fallback={<TrainingSkeleton />}>
        <TrainingContent />
      </Suspense>
    </div>
  );
}
