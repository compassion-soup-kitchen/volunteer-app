import {
  FormCardSkeleton,
  PageHeaderSkeleton,
  PageSkeleton,
} from "@/components/brand/page-skeleton";

export default function EditShiftLoading() {
  return (
    <PageSkeleton>
      <PageHeaderSkeleton back />
      <FormCardSkeleton fields={6} className="max-w-xl" />
    </PageSkeleton>
  );
}
