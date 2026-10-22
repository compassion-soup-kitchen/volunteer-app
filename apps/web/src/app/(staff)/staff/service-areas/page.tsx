import type { Metadata } from "next";
import { connection } from "next/server";
import { requireActiveSession } from "@/lib/action-auth";
import { redirect } from "next/navigation";
import { getServiceAreasWithStats } from "@/lib/service-area-actions";
import { ServiceAreaManager } from "./service-area-manager";
import { PageHeader } from "@/components/brand/page-header";

export const metadata: Metadata = {
  title: "Service areas | Te Pūaroha",
};

export default async function ServiceAreasPage() {
  await connection();
  const session = await requireActiveSession();

  // Admin only - by the live role, not the token's snapshot
  if (session?.user?.role !== "ADMIN") {
    redirect("/staff/dashboard");
  }

  const serviceAreas = await getServiceAreasWithStats();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Ngā wāhi · Service areas"
        title="Service areas"
        description="Manage the kaupapa areas volunteers can contribute to"
      />

      <ServiceAreaManager initialAreas={serviceAreas} />
    </div>
  );
}
