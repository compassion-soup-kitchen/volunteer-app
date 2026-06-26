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

export const metadata: Metadata = {
  title: "My Documents | Te Pūaroha",
};

function DocumentsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 2 }).map((_, i) => (
        <Skeleton key={i} className="h-40 w-full" />
      ))}
    </div>
  );
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
    <div className="mx-auto max-w-2xl space-y-8 pb-24">
      <PageHeader
        backHref="/dashboard"
        eyebrow="Tuhinga · Documents"
        title="My documents"
        description="View agreements and download policies"
      />

      <section className="space-y-3">
        <h2 className="font-serif text-xl font-normal">Agreements</h2>
        <Suspense fallback={<DocumentsSkeleton />}>
          <AgreementsContent />
        </Suspense>
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-xl font-normal">Policies &amp; resources</h2>
        <Suspense fallback={<DocumentsSkeleton />}>
          <FilesContent />
        </Suspense>
      </section>
    </div>
  );
}
