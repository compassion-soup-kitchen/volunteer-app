import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { getVolunteerDetail } from "@/lib/staff-actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/brand/page-header";
import { StatusBadge } from "@/components/brand/status-badge";
import { VolunteerRecord } from "./volunteer-record";

export const metadata: Metadata = {
  title: "Volunteer record | Te Pūaroha",
};

const ROLE_LABEL: Record<string, string> = {
  VOLUNTEER: "Volunteer",
  COORDINATOR: "Coordinator",
  ADMIN: "Admin",
};

// Only elevated roles get a badge here, same as the directory - badging every
// volunteer as "Volunteer" on their own record is noise.
const ROLE_BADGE_VARIANT: Record<string, "default" | "info"> = {
  COORDINATOR: "info",
  ADMIN: "default",
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
  const detail = await getVolunteerDetail(userId);

  if (!detail) {
    notFound();
  }

  const { user, profile } = detail;

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
        description={user.email}
        actions={
          <>
            {ROLE_BADGE_VARIANT[user.role] && (
              <Badge variant={ROLE_BADGE_VARIANT[user.role]}>
                {ROLE_LABEL[user.role] ?? user.role}
              </Badge>
            )}
            {user.status === "ARCHIVED" && <StatusBadge status="ARCHIVED" />}
            {profile ? (
              <StatusBadge status={profile.status} className="text-sm" />
            ) : (
              <Badge variant="outline">No application yet</Badge>
            )}
          </>
        }
      />

      <VolunteerRecord detail={detail} />
    </div>
  );
}
