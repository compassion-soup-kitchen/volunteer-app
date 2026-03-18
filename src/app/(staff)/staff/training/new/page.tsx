import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RiArrowLeftLine } from "@remixicon/react";
import { TrainingForm } from "./training-form";

export const metadata: Metadata = {
  title: "New Training Session | Te Pūaroha Staff",
};

export default function NewTrainingPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href="/staff/training">
            <RiArrowLeftLine className="size-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">
          New Training Session
        </h1>
      </div>
      <TrainingForm />
    </div>
  );
}
