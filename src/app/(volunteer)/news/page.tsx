import type { Metadata } from "next";
import { connection } from "next/server";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { RiMegaphoneLine } from "@remixicon/react";
import { getAnnouncements } from "@/lib/announcement-actions";

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
      <div className="space-y-1">
        <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
          <span className="h-px w-6 bg-primary" aria-hidden />
          <span className="text-primary">Ngā Kōrero</span>
          <span aria-hidden>·</span>
          <span>News &amp; Updates</span>
        </p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          From the kitchen team
        </h1>
        <p className="text-sm text-muted-foreground">
          Notices, newsletters and updates from your coordinators.
        </p>
      </div>

      {announcements.length > 0 ? (
        <div className="space-y-4">
          {announcements.map((a) => (
            <Card key={a.id} id={a.id} className="scroll-mt-20">
              <CardContent className="p-5 sm:p-6">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h2 className="text-lg font-semibold leading-tight">
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
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <RiMegaphoneLine className="size-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">No updates yet</p>
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
