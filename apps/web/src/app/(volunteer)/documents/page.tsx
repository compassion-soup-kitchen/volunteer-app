import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getVolunteerAgreementStatuses,
  getVolunteerDocuments,
} from "@/lib/document-actions";
import { DocumentsView } from "./documents-view";
import { DownloadableFiles } from "./downloadable-files";
import { PageHeader } from "@/components/brand/page-header";
import { SectionHeader } from "@/components/brand/section-header";

export const metadata: Metadata = {
  title: "My Documents | Te Pūaroha",
};

function DocumentsSkeleton() {
  return <Skeleton className="h-44 w-full rounded-xl" />;
}

async function AgreementsContent() {
  const statuses = await getVolunteerAgreementStatuses();
  return <DocumentsView agreements={statuses} />;
}

async function FilesContent() {
  const documents = await getVolunteerDocuments();
  return <DownloadableFiles documents={documents} />;
}

export default function VolunteerDocumentsPage() {
  return (
    <div className="space-y-8 pb-24">
      <PageHeader
        backHref="/dashboard"
        eyebrow="Tuhinga · Documents"
        title="My documents"
        description="View agreements and download policies"
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-10">
        <section className="min-w-0 space-y-4">
          <SectionHeader eyebrow="Ngā whakaaetanga" title="Agreements" />
          <Suspense fallback={<DocumentsSkeleton />}>
            <AgreementsContent />
          </Suspense>
        </section>

        <section className="min-w-0 space-y-4">
          <SectionHeader eyebrow="Ngā rauemi" title="Policies & resources" />
          <Suspense fallback={<DocumentsSkeleton />}>
            <FilesContent />
          </Suspense>
        </section>
      </div>
    </div>
  );
}
