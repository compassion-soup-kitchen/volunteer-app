import type { Metadata } from "next";
import { Suspense } from "react";
import { getActiveTrainingTypes } from "@/lib/training-type-actions";
import { TrainingForm } from "./training-form";
import { PageHeader } from "@/components/brand/page-header";
import { TrainingFormSkeleton } from "./skeleton";

export const metadata: Metadata = {
  title: "New training session | Te Pūaroha",
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
      <Suspense fallback={<TrainingFormSkeleton />}>
        <TrainingFormLoader />
      </Suspense>
    </div>
  );
}
