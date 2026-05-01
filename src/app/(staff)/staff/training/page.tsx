import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RiAddLine } from "@remixicon/react";
import { getStaffTrainingSessions } from "@/lib/training-actions";
import { TrainingList } from "./training-list";

export const metadata: Metadata = {
  title: "Training Sessions | Te Pūaroha Staff",
};

function TrainingListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-24 w-full " />
      ))}
    </div>
  );
}

async function TrainingContent() {
  const sessions = await getStaffTrainingSessions();
  return <TrainingList sessions={sessions} />;
}

export default function StaffTrainingPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Whakangungu — Training
          </h1>
          <p className="text-muted-foreground">
            Manage training sessions for volunteers
          </p>
        </div>
        <Button asChild>
          <Link href="/staff/training/new">
            <RiAddLine className="mr-2 size-4" />
            New Session
          </Link>
        </Button>
      </div>
      <Suspense fallback={<TrainingListSkeleton />}>
        <TrainingContent />
      </Suspense>
    </div>
  );
}
