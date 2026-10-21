import {
  PageHeaderSkeleton,
  PageSkeleton,
  SectionHeaderSkeleton,
} from "@/components/brand/page-skeleton";
import { DocumentsSkeleton } from "./skeleton";

export default function StaffDocumentsLoading() {
  return (
    <PageSkeleton className="space-y-8">
      <PageHeaderSkeleton />
      <section className="space-y-4">
        <SectionHeaderSkeleton trailing />
        <DocumentsSkeleton />
      </section>
      <section className="space-y-4">
        <SectionHeaderSkeleton divider />
        <DocumentsSkeleton />
      </section>
    </PageSkeleton>
  );
}
