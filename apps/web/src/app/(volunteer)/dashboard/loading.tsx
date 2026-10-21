import {
  BlockSkeleton,
  ListCardSkeleton,
  PageSkeleton,
  SectionHeaderSkeleton,
  TextLine,
} from "@/components/brand/page-skeleton";

export default function DashboardLoading() {
  return (
    <PageSkeleton className="space-y-8">
      {/* Greeting masthead */}
      <div className="space-y-1">
        <TextLine className="eyebrow" bar="w-28" />
        <TextLine className="font-serif text-3xl sm:text-4xl" bar="w-60 sm:w-72" />
        <TextLine className="text-sm" bar="w-40" />
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-10">
        <div className="min-w-0 space-y-8">
          <section className="space-y-4">
            <SectionHeaderSkeleton action />
            <BlockSkeleton className="h-40 rounded-2xl" />
          </section>
          <section className="space-y-4">
            <SectionHeaderSkeleton divider action />
            <ListCardSkeleton rows={3} trailing />
          </section>
          <section className="space-y-4">
            <SectionHeaderSkeleton divider action />
            <BlockSkeleton className="h-54 rounded-2xl" />
          </section>
        </div>

        <div className="min-w-0 space-y-8">
          <section className="space-y-4">
            <SectionHeaderSkeleton action />
            <div className="space-y-3">
              <BlockSkeleton className="h-40" />
              <BlockSkeleton className="h-40" />
            </div>
          </section>
          <section className="space-y-3 border-t border-border pt-6">
            <BlockSkeleton className="h-21" />
            <BlockSkeleton className="h-21" />
            <BlockSkeleton className="h-21" />
          </section>
        </div>
      </div>
    </PageSkeleton>
  );
}
