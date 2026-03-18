import type { Metadata } from "next";
import { connection } from "next/server";
import { getServiceAreas } from "@/lib/application-actions";
import { ShiftForm } from "./shift-form";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RiArrowLeftLine } from "@remixicon/react";

export const metadata: Metadata = {
  title: "Create Shift | Te Pūaroha",
};

export default async function NewShiftPage() {
  await connection();
  const serviceAreas = await getServiceAreas();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon-sm">
          <Link href="/staff/shifts">
            <RiArrowLeftLine className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create Shift</h1>
          <p className="text-muted-foreground">
            Add a new shift to the roster
          </p>
        </div>
      </div>

      <ShiftForm serviceAreas={serviceAreas} />
    </div>
  );
}
