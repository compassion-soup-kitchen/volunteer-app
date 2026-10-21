import {
  FormCardSkeleton,
  ListCardSkeleton,
  PageHeaderSkeleton,
  PageSkeleton,
} from "@/components/brand/page-skeleton";

export default function RepeatingShiftLoading() {
  return (
    <PageSkeleton>
      <PageHeaderSkeleton back />
      <div className="grid gap-6 lg:grid-cols-3">
        <ListCardSkeleton title rows={4} className="lg:col-span-1" />
        <FormCardSkeleton fields={4} className="lg:col-span-2" />
      </div>
    </PageSkeleton>
  );
}
