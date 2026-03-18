import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { getShiftDetail } from "@/lib/shift-actions";
import { ShiftDetailView } from "./shift-detail-view";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RiArrowLeftLine } from "@remixicon/react";

export const metadata: Metadata = {
  title: "Shift Details | Te Pūaroha",
};

export default async function ShiftDetailPage({
  params,
}: {
  params: Promise<{ shiftId: string }>;
}) {
  await connection();
  const { shiftId } = await params;
  const shift = await getShiftDetail(shiftId);

  if (!shift) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon-sm">
          <Link href="/staff/shifts">
            <RiArrowLeftLine className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Shift Details</h1>
          <p className="text-muted-foreground">
            View and manage this shift
          </p>
        </div>
      </div>

      <ShiftDetailView shift={shift} />
    </div>
  );
}
