import {
  FormCardSkeleton,
  PageHeaderSkeleton,
  PageSkeleton,
} from "@/components/brand/page-skeleton";

export default function EditOfflineVolunteerLoading() {
  return (
    <PageSkeleton>
      <PageHeaderSkeleton back description={false} />
      <FormCardSkeleton fields={8} className="max-w-2xl" />
    </PageSkeleton>
  );
}
