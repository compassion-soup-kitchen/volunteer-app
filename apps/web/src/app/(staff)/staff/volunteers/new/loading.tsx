import {
  FormCardSkeleton,
  PageHeaderSkeleton,
  PageSkeleton,
} from "@/components/brand/page-skeleton";

export default function NewOfflineVolunteerLoading() {
  return (
    <PageSkeleton>
      <PageHeaderSkeleton back />
      <FormCardSkeleton fields={8} className="max-w-2xl" />
    </PageSkeleton>
  );
}
