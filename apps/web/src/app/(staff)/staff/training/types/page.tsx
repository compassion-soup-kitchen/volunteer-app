import type { Metadata } from "next";
import { connection } from "next/server";
import { getTrainingTypesWithStats } from "@/lib/training-type-actions";
import { TrainingTypeManager } from "./training-type-manager";
import { PageHeader } from "@/components/brand/page-header";

export const metadata: Metadata = {
  title: "Training Types | Te Pūaroha Staff",
};

// Coordinators schedule the training, so unlike service areas (admin-only) they
// can manage the types too — the actions enforce the same rule.
export default async function TrainingTypesPage() {
  await connection();
  const trainingTypes = await getTrainingTypesWithStats();

  return (
    <div className="space-y-6">
      <PageHeader
        backHref="/staff/training"
        eyebrow="Ngā momo · Training types"
        title="Training types"
        description="The kinds of training you run — rename them, add your own, or retire the ones you've moved on from"
      />
      <TrainingTypeManager initialTypes={trainingTypes} />
    </div>
  );
}
