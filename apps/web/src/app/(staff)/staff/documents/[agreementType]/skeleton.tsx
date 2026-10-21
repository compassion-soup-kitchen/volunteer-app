import {
  FormCardSkeleton,
  ListCardSkeleton,
} from "@/components/brand/page-skeleton";

/** The agreement editor and its sign-off list: shared by the page's Suspense and loading.tsx. */
export function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <FormCardSkeleton title fields={3} />
      <ListCardSkeleton title rows={5} trailing />
    </div>
  );
}
