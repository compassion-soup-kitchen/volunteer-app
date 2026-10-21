import { PageHeaderSkeleton, PageSkeleton } from "@/components/brand/page-skeleton";
import { DetailSkeleton } from "./skeleton";

export default function AgreementDetailLoading() {
  return (
    <PageSkeleton>
      <PageHeaderSkeleton back />
      <DetailSkeleton />
    </PageSkeleton>
  );
}
