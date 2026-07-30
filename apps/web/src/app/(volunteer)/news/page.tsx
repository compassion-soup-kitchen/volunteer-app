import type { Metadata } from "next";
import { connection } from "next/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAnnouncements } from "@/lib/announcement-actions";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/brand/page-header";
import { Illustration } from "@/components/brand/illustration";
import { AnnouncementAttachments } from "@/components/announcement-attachments";
import { EventInvitation } from "@/components/event/event-invitation";
import { formatTimestampInAppZone, todayInAppZone } from "@/lib/date-only";

export const metadata: Metadata = {
  title: "News & Updates | Te Pūaroha",
};

function formatNoticeDate(date: Date) {
  // Server-rendered, so the timezone has to be named: the container's UTC
  // clock would date a 9am pānui to the day before.
  return formatTimestampInAppZone(date);
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

export default async function NewsPage() {
  await connection();
  const [announcements, session] = await Promise.all([getAnnouncements(), auth()]);
  const role = session?.user?.role ?? "VOLUNTEER";
  const today = todayInAppZone();

  return (
    <div className="space-y-6">
      <PageHeader
        backHref="/dashboard"
        eyebrow="Pānui · Notices"
        title="From the kitchen team"
        description="Notices, newsletters and updates from your coordinators."
      />

      {announcements.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
          {announcements.map((a) => (
            <Card key={a.id} id={a.id} className="scroll-mt-20">
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <Badge variant={a.event ? "default" : "neutral"}>
                    {a.event ? "Invitation" : "Notice"}
                  </Badge>
                  <time
                    dateTime={a.sentAt.toISOString()}
                    className="shrink-0 text-xs text-muted-foreground"
                  >
                    {formatNoticeDate(a.sentAt)}
                  </time>
                </div>
                <div className="space-y-1.5">
                  <h2 className="font-serif text-lg font-medium tracking-tight text-balance">
                    {a.title}
                  </h2>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                    {a.body}
                  </div>
                </div>
                {/* An event pānui carries its reply, so nobody has to go looking
                    for where to say yes. The title is already above. */}
                {a.event && (
                  <div className="border-t border-border pt-3">
                    <EventInvitation
                      event={a.event}
                      role={role}
                      today={today}
                      showTitle={false}
                    />
                  </div>
                )}
                {a.attachments.length > 0 && (
                  <div className="space-y-2 border-t border-border pt-3">
                    <p className="eyebrow text-[0.62rem] text-muted-foreground">
                      {a.attachments.length === 1
                        ? "Attachment"
                        : `${a.attachments.length} attachments`}
                    </p>
                    <AnnouncementAttachments attachments={a.attachments} />
                  </div>
                )}
                {a.authorName && (
                  <div className="flex items-center gap-2 border-t border-border pt-3">
                    <span
                      aria-hidden
                      className="flex size-6 shrink-0 items-center justify-center rounded-full bg-neutral-tint text-[10px] font-bold text-neutral-tint-foreground"
                    >
                      {initials(a.authorName)}
                    </span>
                    <p className="min-w-0 truncate text-xs text-muted-foreground">
                      {a.authorName}
                    </p>
                  </div>
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
              <p className="font-serif text-lg font-medium tracking-tight">
                No updates yet
              </p>
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
