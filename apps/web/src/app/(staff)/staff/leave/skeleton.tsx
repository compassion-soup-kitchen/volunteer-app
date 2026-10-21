import {
  ActionBarSkeleton,
  ListCardSkeleton,
} from "@/components/brand/page-skeleton";

/** The leave board while it loads: shared by the page's Suspense and loading.tsx. */
export function BoardSkeleton() {
  return (
    <>
      <ActionBarSkeleton />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
        <div className="space-y-6">
          <ListCardSkeleton title rows={2} />
          <ListCardSkeleton title rows={1} />
        </div>
        <ListCardSkeleton title rows={2} />
      </div>
    </>
  );
}
