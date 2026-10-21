import type { Metadata } from "next";
import { Suspense } from "react";
import {
  getAgreementOverview,
  getUploadedDocuments,
} from "@/lib/document-actions";
import { DocumentsOverview } from "./documents-overview";
import { FileManager } from "./file-manager";
import { PageHeader } from "@/components/brand/page-header";
import { SectionHeader } from "@/components/brand/section-header";
import { NewAgreementDialog } from "./new-agreement-dialog";
import { DocumentsSkeleton } from "./skeleton";

export const metadata: Metadata = {
  title: "Documents | Te Pūaroha",
};

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
        <SectionHeader
          eyebrow="Ngā whakaaetanga"
          title="Agreements"
          trailing={<NewAgreementDialog />}
        />
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
