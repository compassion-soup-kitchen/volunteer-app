import {
  FormCardSkeleton,
  PageHeaderSkeleton,
  PageSkeleton,
} from "@/components/brand/page-skeleton";

export default function ProfileEditLoading() {
  return (
    <PageSkeleton className="mx-auto max-w-2xl pb-24">
      <PageHeaderSkeleton back />
      <FormCardSkeleton fields={9} />
    </PageSkeleton>
  );
}
