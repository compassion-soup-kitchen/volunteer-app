import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getAgreementOverview,
  getUploadedDocuments,
} from "@/lib/document-actions";
import { DocumentsOverview } from "./documents-overview";
import { FileManager } from "./file-manager";

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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Tuhinga — Documents
        </h1>
        <p className="text-muted-foreground">
          Manage agreements, policies, and training materials
        </p>
      </div>

      {/* Agreements Section */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Agreements</h2>
        <Suspense fallback={<DocumentsSkeleton />}>
          <AgreementsContent />
        </Suspense>
      </section>

      {/* Uploaded Files Section */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Uploaded Files</h2>
        <Suspense fallback={<DocumentsSkeleton />}>
          <FilesContent />
        </Suspense>
      </section>
    </div>
  );
}
