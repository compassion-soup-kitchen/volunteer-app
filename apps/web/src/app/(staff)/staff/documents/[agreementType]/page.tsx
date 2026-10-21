import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getAgreementDetail } from "@/lib/document-actions";
import { AgreementDetailView } from "./agreement-detail";
import { PageHeader } from "@/components/brand/page-header";
import { DetailSkeleton } from "./skeleton";

export const metadata: Metadata = {
  title: "Agreement Detail | Te Pūaroha Staff",
};

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
      <PageHeader
        backHref="/staff/documents"
        eyebrow="Tuhinga · Agreement"
        title="Agreement detail"
        description="Edit template and track signing status"
      />
      <Suspense fallback={<DetailSkeleton />}>
        <DetailContent agreementType={agreementType} />
      </Suspense>
    </div>
  );
}
