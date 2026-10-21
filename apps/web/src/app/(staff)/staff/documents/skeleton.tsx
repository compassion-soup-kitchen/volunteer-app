import { ListCardSkeleton } from "@/components/brand/page-skeleton";

/** A documents list while it loads: shared by the page's Suspense and loading.tsx. */
export function DocumentsSkeleton() {
  return <ListCardSkeleton rows={3} trailing />;
}
