import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RiArrowLeftLine } from "@remixicon/react";
import {
  getVolunteerAgreementStatuses,
  getVolunteerDocuments,
} from "@/lib/document-actions";
import { DocumentsView } from "./documents-view";
import { DownloadableFiles } from "./downloadable-files";

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
      <div className="flex items-center gap-3">
        <div className="hidden sm:block">
          <Button variant="ghost" size="icon-sm" asChild>
            <Link href="/dashboard">
              <RiArrowLeftLine className="size-4" />
            </Link>
          </Button>
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Tuhinga — My Documents
          </h1>
          <p className="text-muted-foreground">
            View agreements and download policies
          </p>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Agreements</h2>
        <Suspense fallback={<DocumentsSkeleton />}>
          <AgreementsContent />
        </Suspense>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Policies & Resources</h2>
        <Suspense fallback={<DocumentsSkeleton />}>
          <FilesContent />
        </Suspense>
      </section>
    </div>
  );
}
