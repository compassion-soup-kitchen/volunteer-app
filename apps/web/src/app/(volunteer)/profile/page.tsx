import type { Metadata } from "next";
import { connection } from "next/server";
import { auth } from "@/lib/auth";
import Link from "next/link";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { IconChip } from "@/components/brand/icon-chip";
import { PageHeader } from "@/components/brand/page-header";
import { StatusBadge } from "@/components/brand/status-badge";
import { cn } from "@/lib/utils";
import {
  RiUserLine,
  RiPhoneLine,
  RiMapPinLine,
  RiCakeLine,
  RiUserHeartLine,
  RiShieldCheckLine,
  RiEditLine,
  RiArrowRightLine,
  RiGraduationCapLine,
} from "@remixicon/react";
import { getVolunteerProfile } from "@/lib/application-actions";
import { getMyGroups } from "@/lib/group-actions";
import { GroupBadge } from "@/components/brand/group-badge";
import { getVolunteerTrainingHistory } from "@/lib/training-actions";
import { formatDateOnly, formatTimestampInAppZone } from "@/lib/date-only";

export const metadata: Metadata = {
  title: "My Profile | Te Pūaroha",
};

const DAYS_LONG: Record<string, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

export default async function ProfilePage() {
  await connection();
  const session = await auth();
  const [profile, trainingHistory, myGroups] = await Promise.all([
    getVolunteerProfile(),
    getVolunteerTrainingHistory(),
    getMyGroups(),
  ]);

  const firstName = session?.user?.name?.split(" ")[0] || "there";
  const initials =
    session?.user?.name
      ?.split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "TP";

  // No profile yet — prompt to apply
  if (!profile) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <PageHeader
          eyebrow="Tō kōtaha · Profile"
          title="My profile"
          description={`Kia ora, ${firstName}`}
        />

        <Card variant="tint">
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <h2 className="font-serif text-xl font-medium tracking-tight">
                Complete your application first
              </h2>
              <p className="text-sm text-muted-foreground">
                Your profile will appear here once you&apos;ve submitted your
                volunteer application.
              </p>
            </div>
            <Button asChild>
              <Link href="/application">
                Start application
                <RiArrowRightLine className="size-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const availability = (profile.availability as Record<string, string[]>) || {};
  const availableDays = Object.entries(availability).filter(
    ([, slots]) => slots.length > 0
  );

  return (
    <div className="space-y-6 pb-24">
      <PageHeader
        backHref="/dashboard"
        eyebrow="Tō kōtaha · Profile"
        title={
          <span className="flex items-center gap-3">
            <span aria-hidden>
              <Avatar className="size-12">
                <AvatarImage src={session?.user?.image ?? undefined} alt="" />
                <AvatarFallback className="font-serif text-base font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </span>
            My profile
          </span>
        }
        description={`Kia ora, ${firstName}`}
        actions={
          <>
            <StatusBadge status={profile.status} />
            <Button size="sm" className="gap-1.5" asChild>
              <Link href="/profile/edit">
                <RiEditLine className="size-3.5" />
                Edit profile
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-10">
        {/* Main column — who you are and your record with us */}
        <div className="min-w-0 space-y-6">
          {/* Contact details */}
          <Card className="gap-0 pb-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Contact details</CardTitle>
            </CardHeader>
            <ul className="divide-y divide-border border-t border-border">
              <DetailRow
                icon={RiUserLine}
                label="Name"
                value={session?.user?.name || "Not provided"}
              />
              <DetailRow
                icon={RiPhoneLine}
                label="Phone"
                value={profile.phone || "Not provided"}
              />
              <DetailRow
                icon={RiMapPinLine}
                label="Address"
                value={profile.address || "Not provided"}
              />
              <DetailRow
                icon={RiCakeLine}
                label="Date of birth"
                value={
                  profile.dateOfBirth
                    ? formatTimestampInAppZone(profile.dateOfBirth, {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })
                    : "Not provided"
                }
              />
            </ul>
          </Card>

          {/* Emergency contact */}
          <Card className="gap-0 pb-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Emergency contact</CardTitle>
            </CardHeader>
            <ul className="divide-y divide-border border-t border-border">
              <DetailRow
                icon={RiUserLine}
                label="Name"
                value={profile.emergencyContactName || "Not provided"}
              />
              <DetailRow
                icon={RiPhoneLine}
                label="Phone"
                value={profile.emergencyContactPhone || "Not provided"}
              />
              <DetailRow
                icon={RiUserHeartLine}
                label="Relationship"
                value={profile.emergencyContactRelationship || "Not provided"}
              />
            </ul>
          </Card>

          {/* Training history */}
          <Card className="gap-0 pb-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Whakangungu · Training
              </CardTitle>
            </CardHeader>
            {trainingHistory.length > 0 ? (
              <ul className="divide-y divide-border border-t border-border">
                {trainingHistory.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 px-5 py-3">
                    <IconChip size="sm">
                      <RiGraduationCapLine />
                    </IconChip>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {item.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateOnly(item.date, {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                        {" · "}
                        {item.type.name}
                      </p>
                    </div>
                    <StatusBadge
                      className="shrink-0"
                      status={item.status}
                      label={
                        item.status === "ATTENDED"
                          ? "Completed"
                          : item.status === "REGISTERED"
                            ? "Upcoming"
                            : item.status === "NO_SHOW"
                              ? "Missed"
                              : "Cancelled"
                      }
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <CardContent className="border-t border-border pt-3 pb-2">
                <p className="text-sm text-muted-foreground">
                  No training sessions yet
                </p>
              </CardContent>
            )}
          </Card>

          {/* Signed agreements */}
          <Card className="gap-0 pb-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Signed agreements</CardTitle>
              <CardAction>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/documents">
                    View all
                    <RiArrowRightLine className="size-3.5" />
                  </Link>
                </Button>
              </CardAction>
            </CardHeader>
            {profile.signedAgreements.length > 0 ? (
              <ul className="divide-y divide-border border-t border-border">
                {profile.signedAgreements.map((agreement) => (
                  <li
                    key={agreement.id}
                    className="flex items-center gap-3 px-5 py-3"
                  >
                    <IconChip size="sm">
                      <RiShieldCheckLine />
                    </IconChip>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {agreement.agreementType === "CODE_OF_CONDUCT"
                          ? "Te Tikanga · Code of conduct"
                          : "Safeguarding policy"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Signed{" "}
                        {formatTimestampInAppZone(agreement.signedAt, {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <Badge variant="success" className="shrink-0">
                      Signed
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <CardContent className="border-t border-border pt-3 pb-2">
                <p className="text-sm text-muted-foreground">
                  No agreements signed
                </p>
              </CardContent>
            )}
          </Card>
        </div>

        {/* Quiet rail — when you can help and what you bring */}
        <div className="min-w-0 space-y-6">
          {/* Groups - where you sit in the wider crew */}
          <Card className="gap-0 pb-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Ō rōpū · Your groups</CardTitle>
              <CardAction>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/team">
                    Our team
                    <RiArrowRightLine className="size-3.5" />
                  </Link>
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="border-t border-border pt-3 pb-2">
              {myGroups.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {myGroups.map((group) => (
                    <GroupBadge key={group.id} group={group} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  You&apos;re not in a group yet. Have a look at who&apos;s who
                  on the team page.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Availability */}
          <Card className="gap-0 pb-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Availability</CardTitle>
            </CardHeader>
            {availableDays.length > 0 ? (
              <ul className="divide-y divide-border border-t border-border">
                {availableDays.map(([day, slots]) => (
                  <li
                    key={day}
                    className="flex items-center justify-between gap-3 px-5 py-2.5"
                  >
                    <span className="text-sm font-semibold capitalize">
                      {DAYS_LONG[day] || day}
                    </span>
                    <span className="flex flex-wrap justify-end gap-1.5">
                      {(slots as string[]).map((slot) => (
                        <Pill key={slot} className="capitalize">
                          {slot}
                        </Pill>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <CardContent className="border-t border-border pt-3 pb-2">
                <p className="text-sm text-muted-foreground">
                  No availability set
                </p>
              </CardContent>
            )}
          </Card>

          {/* Areas of interest */}
          <Card className="gap-0 pb-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Areas of interest</CardTitle>
            </CardHeader>
            <CardContent className="border-t border-border pt-3 pb-2">
              {profile.interests.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {profile.interests.map((area) => (
                    <Pill key={area.id}>{area.name}</Pill>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No interests selected
                </p>
              )}
            </CardContent>
          </Card>

          {/* Skills & about */}
          <Card className="gap-0 pb-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Skills &amp; about</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 border-t border-border pt-3 pb-2">
              {profile.skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {profile.skills.map((skill) => (
                    <Pill key={skill}>{skill}</Pill>
                  ))}
                </div>
              )}
              {profile.bio && <p className="text-sm">{profile.bio}</p>}
              {profile.skills.length === 0 && !profile.bio && (
                <p className="text-sm text-muted-foreground">
                  No details provided
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <li className="flex items-center gap-3 px-5 py-3">
      <IconChip size="sm">
        <Icon />
      </IconChip>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold">{value}</p>
      </div>
    </li>
  );
}

function Pill({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm bg-neutral-tint px-2.5 py-1 text-xs font-semibold text-neutral-tint-foreground",
        className
      )}
    >
      {children}
    </span>
  );
}
