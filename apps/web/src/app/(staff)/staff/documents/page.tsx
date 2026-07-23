import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getAgreementOverview,
  getUploadedDocuments,
} from "@/lib/document-actions";
import { DocumentsOverview } from "./documents-overview";
import { FileManager } from "./file-manager";
import { PageHeader } from "@/components/brand/page-header";
import { SectionHeader } from "@/components/brand/section-header";

export const metadata: Metadata = {
  title: "Documents | Te Pūaroha Staff",
};

function DocumentsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 2 }).map((_, i) => (
        <Skeleton key={i} className="h-32 w-full" />
      ))}
    </div>
  );
}

async function AgreementsContent() {
  const overview = await getAgreementOverview();
  return <DocumentsOverview agreements={overview} />;
}

async function FilesContent() {
  const documents = await getUploadedDocuments();
  return <FileManager documents={documents} />;
}

export default function StaffDocumentsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Tuhinga · Documents"
        title="Documents"
        description="Manage agreements, policies, and training materials"
      />

      {/* Agreements Section */}
      <section className="space-y-4">
        <SectionHeader eyebrow="Ngā whakaaetanga" title="Agreements" />
        <Suspense fallback={<DocumentsSkeleton />}>
          <AgreementsContent />
        </Suspense>
      </section>

      {/* Uploaded Files Section */}
      <section className="space-y-4">
        <SectionHeader divider eyebrow="Ngā kōnae" title="Uploaded files" />
        <Suspense fallback={<DocumentsSkeleton />}>
          <FilesContent />
        </Suspense>
      </section>
    </div>
  );
}
