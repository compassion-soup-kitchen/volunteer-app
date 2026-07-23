import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RiAddLine } from "@remixicon/react";
import { getStaffTrainingSessions } from "@/lib/training-actions";
import { TrainingList } from "./training-list";
import { PageHeader } from "@/components/brand/page-header";

export const metadata: Metadata = {
  title: "Training Sessions | Te Pūaroha Staff",
};

function TrainingListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-24 w-full rounded-xl" />
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
      <PageHeader
        eyebrow="Whakangungu · Training"
        title="Training"
        description="Manage training sessions for volunteers"
        actions={
          <Button asChild>
            <Link href="/staff/training/new">
              <RiAddLine className="size-4" />
              Schedule training
            </Link>
          </Button>
        }
      />
      <Suspense fallback={<TrainingListSkeleton />}>
        <TrainingContent />
      </Suspense>
    </div>
  );
}
