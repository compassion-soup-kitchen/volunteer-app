import type { Metadata } from "next";
import { TrainingForm } from "./training-form";
import { PageHeader } from "@/components/brand/page-header";

export const metadata: Metadata = {
  title: "New Training Session | Te Pūaroha Staff",
};

export default function NewTrainingPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        backHref="/staff/training"
        eyebrow="Hanga · New session"
        title="New training session"
      />
      <TrainingForm />
    </div>
  );
}
