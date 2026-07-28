import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getActiveTrainingTypes } from "@/lib/training-type-actions";
import { TrainingForm } from "./training-form";
import { PageHeader } from "@/components/brand/page-header";

export const metadata: Metadata = {
  title: "New Training Session | Te Pūaroha Staff",
};

async function TrainingFormLoader() {
  const trainingTypes = await getActiveTrainingTypes();
  return <TrainingForm trainingTypes={trainingTypes} />;
}

export default function NewTrainingPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        backHref="/staff/training"
        eyebrow="Hanga · New session"
        title="New training session"
      />
      <Suspense fallback={<Skeleton className="h-[40rem] max-w-xl rounded-xl" />}>
        <TrainingFormLoader />
      </Suspense>
    </div>
  );
}
