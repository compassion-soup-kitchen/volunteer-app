import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getServiceAreasWithStats } from "@/lib/service-area-actions";
import { ServiceAreaManager } from "./service-area-manager";

export const metadata: Metadata = {
  title: "Service Areas | Te Pūaroha",
};

export default async function ServiceAreasPage() {
  const session = await auth();

  // Admin only
  if (session?.user?.role !== "ADMIN") {
    redirect("/staff/dashboard");
  }

  const serviceAreas = await getServiceAreasWithStats();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Service Areas</h1>
        <p className="text-muted-foreground">
          Manage the kaupapa areas volunteers can contribute to
        </p>
      </div>

      <ServiceAreaManager initialAreas={serviceAreas} />
    </div>
  );
}
