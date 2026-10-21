import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getVolunteerDetail } from "@/lib/staff-actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PageHeader } from "@/components/brand/page-header";
import { StatusBadge } from "@/components/brand/status-badge";
import { PersonBadges, hasRoleBadge } from "@/components/brand/person-badges";
import { Button } from "@/components/ui/button";
import { contactLine } from "@/lib/format";
import Link from "next/link";
import { RiPencilLine, RiSuitcaseLine } from "@remixicon/react";
import { getLeaveFor } from "@/lib/leave-actions";
import { describeLeaveStatus } from "@/lib/leave";
import { VolunteerRecord } from "./volunteer-record";

export const metadata: Metadata = {
  title: "Volunteer record | Te Pūaroha",
};

function initials(name: string | null) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase() || "?";
}

export default async function VolunteerDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  await connection();
  const { userId } = await params;
  const [detail, session] = await Promise.all([getVolunteerDetail(userId), auth()]);
  const viewerUserId = session?.user?.id;

  if (!detail) {
    notFound();
  }

  const { user, profile } = detail;
  // Volunteers and the kitchen team both keep leave, so it shows on either record.
  const leave = await getLeaveFor(user.id);

  return (
    <div className="space-y-6">
      <PageHeader
        backHref="/staff/volunteers"
        eyebrow="Te tangata · Volunteer record"
        title={
          <span className="flex items-center gap-3">
            <span aria-hidden>
              <Avatar className="size-11">
                <AvatarImage src={user.image ?? undefined} alt="" />
                <AvatarFallback className="font-serif text-base font-medium">
                  {initials(user.name)}
                </AvatarFallback>
              </Avatar>
            </span>
            {user.name || "Unnamed volunteer"}
          </span>
        }
        description={contactLine({ email: user.email, phone: profile?.phone })}
        actions={
          <>
            <PersonBadges role={user.role} isOffline={user.isOffline} status={user.status} />
            {leave?.current && (
              <StatusBadge
                status="LEAVE_CURRENT"
                label={
                  <>
                    <RiSuitcaseLine aria-hidden />
                    {describeLeaveStatus(leave.current, leave.today)}
                  </>
                }
              />
            )}
            {profile ? (
              <StatusBadge status={profile.status} className="text-sm" />
            ) : (
              // The kitchen team needn't apply; their role badge says who they are.
              !hasRoleBadge(user.role) && <StatusBadge status="NO_APPLICATION" />
            )}
            {user.isOffline && profile && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/staff/volunteers/${user.id}/edit`}>
                  <RiPencilLine />
                  Edit details
                </Link>
              </Button>
            )}
          </>
        }
      />

      <VolunteerRecord detail={detail} leave={leave} viewerUserId={viewerUserId} />
    </div>
  );
}
