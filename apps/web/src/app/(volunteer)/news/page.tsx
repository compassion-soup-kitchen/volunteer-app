import type { Metadata } from "next";
import { connection } from "next/server";
import { Card, CardContent } from "@/components/ui/card";
import { getAnnouncements } from "@/lib/announcement-actions";
import { PageHeader } from "@/components/brand/page-header";
import { Illustration } from "@/components/brand/illustration";

export const metadata: Metadata = {
  title: "News & Updates | Te Pūaroha",
};

function formatLongDate(date: Date) {
  return new Date(date).toLocaleDateString("en-NZ", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function NewsPage() {
  await connection();
  const announcements = await getAnnouncements();

  return (
    <div className="space-y-6">
      <PageHeader
        backHref="/dashboard"
        eyebrow="Ngā kōrero · News & updates"
        title="From the kitchen team"
        description="Notices, newsletters and updates from your coordinators."
      />

      {announcements.length > 0 ? (
        <div className="space-y-4">
          {announcements.map((a) => (
            <Card key={a.id} id={a.id} className="scroll-mt-20">
              <CardContent className="p-5 sm:p-6">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h2 className="font-serif text-xl font-normal leading-tight">
                    {a.title}
                  </h2>
                  <time
                    dateTime={a.sentAt.toISOString()}
                    className="shrink-0 text-xs text-muted-foreground"
                  >
                    {formatLongDate(a.sentAt)}
                  </time>
                </div>
                <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                  {a.body}
                </div>
                {a.authorName && (
                  <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
                    — {a.authorName}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Illustration name="korero" size={96} />
            <div>
              <p className="font-serif text-lg font-normal">No updates yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                When your coordinators post news, it&apos;ll show up here.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
