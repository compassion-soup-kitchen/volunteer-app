import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RiArrowLeftLine } from "@remixicon/react";
import { getAgreementDetail } from "@/lib/document-actions";
import { AgreementDetailView } from "./agreement-detail";

export const metadata: Metadata = {
  title: "Agreement Detail | Te Pūaroha Staff",
};

function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

async function DetailContent({
  agreementType,
}: {
  agreementType: string;
}) {
  const detail = await getAgreementDetail(agreementType);
  if (!detail) notFound();
  return <AgreementDetailView detail={detail} />;
}

export default async function AgreementDetailPage({
  params,
}: {
  params: Promise<{ agreementType: string }>;
}) {
  await connection();
  const { agreementType } = await params;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href="/staff/documents">
            <RiArrowLeftLine className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Agreement Detail
          </h1>
          <p className="text-muted-foreground">
            Edit template and track signing status
          </p>
        </div>
      </div>
      <Suspense fallback={<DetailSkeleton />}>
        <DetailContent agreementType={agreementType} />
      </Suspense>
    </div>
  );
}
