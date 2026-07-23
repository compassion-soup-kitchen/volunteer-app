import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { getShiftDetail } from "@/lib/shift-actions";
import { ShiftDetailView } from "./shift-detail-view";
import { PageHeader } from "@/components/brand/page-header";

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
      <PageHeader
        backHref="/staff/shifts"
        eyebrow="Te wāhi mahi · Shift"
        title={shift.serviceArea.name}
        description="View and manage this shift"
      />

      <ShiftDetailView shift={shift} />
    </div>
  );
}
