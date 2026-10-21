import {
  ListCardSkeleton,
  SectionHeaderSkeleton,
  StatTilesSkeleton,
} from "@/components/brand/page-skeleton";

// The dashboard's sections stream separately; each has its own placeholder,
// shared by the page's Suspense boundaries and loading.tsx.

export function StatsSkeleton() {
  return <StatTilesSkeleton />;
}

export function ActivitySkeleton() {
  return (
    <section className="min-w-0 space-y-4">
      <SectionHeaderSkeleton />
      <ListCardSkeleton rows={5} />
    </section>
  );
}

export function AwayTodaySkeleton() {
  return (
    <section className="min-w-0 space-y-4">
      <SectionHeaderSkeleton action />
      <ListCardSkeleton rows={1} />
    </section>
  );
}
