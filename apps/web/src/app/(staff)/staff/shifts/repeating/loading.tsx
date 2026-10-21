import {
  ListCardSkeleton,
  PageHeaderSkeleton,
  PageSkeleton,
} from "@/components/brand/page-skeleton";

export default function RepeatingShiftsLoading() {
  return (
    <PageSkeleton>
      <PageHeaderSkeleton back actions={1} />
      <ListCardSkeleton rows={4} />
    </PageSkeleton>
  );
}
