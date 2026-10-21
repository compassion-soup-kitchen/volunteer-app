import type { Metadata } from "next";
import { connection } from "next/server";
import { auth } from "@/lib/auth";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PersonAvatar } from "@/components/brand/person-avatar";
import { DeleteAccountCard } from "@/components/account/delete-account-card";
import { IconChip } from "@/components/brand/icon-chip";
import { BleedList, DetailList } from "@/components/brand/detail-list";
import { ListCard, ListCardBody } from "@/components/brand/list-card";
import { PageHeader } from "@/components/brand/page-header";
import { EmptyState } from "@/components/brand/empty-state";
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
  RiSuitcaseLine,
  RiGroupLine,
  RiCalendarLine,
  RiHeartLine,
  RiStarLine,
} from "@remixicon/react";
import { getVolunteerProfile } from "@/lib/application-actions";
import { getMyGroups } from "@/lib/group-actions";
import { GroupBadge } from "@/components/brand/group-badge";
import { getVolunteerTrainingHistory } from "@/lib/training-actions";
import { agreementLabel } from "@/lib/agreement-labels";
import { formatDateOnly, formatTimestampInAppZone } from "@/lib/date-only";
import { getMyLeave, type LeaveOverview } from "@/lib/leave-actions";
import {
  describeLeaveStatus,
  formatLeaveRange,
} from "@/lib/leave";

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
  const [profile, trainingHistory, myGroups, leave] = await Promise.all([
    getVolunteerProfile(),
    getVolunteerTrainingHistory(),
    getMyGroups(),
    getMyLeave(),
  ]);

  const firstName = session?.user?.name?.split(" ")[0] || "there";

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
        eyebrow="Tō kōtaha · Profile"
        title={
          <span className="flex items-center gap-3">
            <PersonAvatar
              name={session?.user?.name}
              image={session?.user?.image}
              className="size-12"
              fallbackClassName="font-serif text-base font-medium"
            />
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
          <ListCard title="Contact details">
            <DetailList
              facts={[
                {
                  icon: RiUserLine,
                  label: "Name",
                  value: session?.user?.name || "Not provided",
                },
                {
                  icon: RiPhoneLine,
                  label: "Phone",
                  value: profile.phone || "Not provided",
                },
                {
                  icon: RiMapPinLine,
                  label: "Address",
                  value: profile.address || "Not provided",
                },
                {
                  icon: RiCakeLine,
                  label: "Date of birth",
                  value: profile.dateOfBirth
                    ? formatTimestampInAppZone(profile.dateOfBirth, {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })
                    : "Not provided",
                },
              ]}
            />
          </ListCard>

          <ListCard title="Emergency contact">
            <DetailList
              facts={[
                {
                  icon: RiUserLine,
                  label: "Name",
                  value: profile.emergencyContactName || "Not provided",
                },
                {
                  icon: RiPhoneLine,
                  label: "Phone",
                  value: profile.emergencyContactPhone || "Not provided",
                },
                {
                  icon: RiUserHeartLine,
                  label: "Relationship",
                  value: profile.emergencyContactRelationship || "Not provided",
                },
              ]}
            />
          </ListCard>

          <ListCard title="Whakangungu · Training">
            {trainingHistory.length > 0 ? (
              <BleedList>
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
              </BleedList>
            ) : (
              <EmptyState
                bare
                size="compact"
                icon={<RiGraduationCapLine />}
                title="No training sessions yet"
                description="Sessions you register for will show up here."
                className="border-t border-border"
              />
            )}
          </ListCard>

          <ListCard
            title="Signed agreements"
            action={{ label: "View all", href: "/documents" }}
          >
            {profile.signedAgreements.length > 0 ? (
              <BleedList>
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
                        {agreementLabel(agreement.agreementType)}
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
                    <StatusBadge status="SIGNED" className="shrink-0" />
                  </li>
                ))}
              </BleedList>
            ) : (
              <EmptyState
                bare
                size="compact"
                icon={<RiShieldCheckLine />}
                title="No agreements signed"
                description="Agreements you confirm will appear here."
                className="border-t border-border"
              />
            )}
          </ListCard>
        </div>

        {/* Quiet rail — when you can help and what you bring */}
        <div className="min-w-0 space-y-6">
          {/* Leave - first in the rail, because it's the one thing here
              that changes what the roster does with you. */}
          {leave && <LeaveSummaryCard leave={leave} />}

          {/* Groups - where you sit in the wider crew */}
          <ListCard
            title="Ō rōpū · Your groups"
            action={{ label: "Our team", href: "/team" }}
          >
            {myGroups.length > 0 ? (
              <ListCardBody>
                <div className="flex flex-wrap gap-2">
                  {myGroups.map((group) => (
                    <GroupBadge key={group.id} group={group} />
                  ))}
                </div>
              </ListCardBody>
            ) : (
              <EmptyState
                bare
                size="compact"
                icon={<RiGroupLine />}
                title="Not in a group yet"
                description="Have a look at who's who on the team page."
                className="border-t border-border"
              />
            )}
          </ListCard>

          <ListCard title="Availability">
            {availableDays.length > 0 ? (
              <BleedList>
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
              </BleedList>
            ) : (
              <EmptyState
                bare
                size="compact"
                icon={<RiCalendarLine />}
                title="No availability set"
                description="Add the days that suit you so coordinators know when to ask."
                className="border-t border-border"
              />
            )}
          </ListCard>

          <ListCard title="Areas of interest">
            {profile.interests.length > 0 ? (
              <ListCardBody className="flex flex-wrap gap-2">
                {profile.interests.map((area) => (
                  <Pill key={area.id}>{area.name}</Pill>
                ))}
              </ListCardBody>
            ) : (
              <EmptyState
                bare
                size="compact"
                icon={<RiHeartLine />}
                title="No interests chosen"
                description="Pick the kinds of mahi you enjoy when you edit your profile."
                className="border-t border-border"
              />
            )}
          </ListCard>

          <ListCard title="Skills & about">
            {profile.skills.length > 0 || profile.bio ? (
              <ListCardBody className="space-y-3">
                {profile.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {profile.skills.map((skill) => (
                      <Pill key={skill}>{skill}</Pill>
                    ))}
                  </div>
                )}
                {profile.bio && <p className="text-sm">{profile.bio}</p>}
              </ListCardBody>
            ) : (
              <EmptyState
                bare
                size="compact"
                icon={<RiStarLine />}
                title="Nothing added yet"
                description="Share your skills or a few words about yourself."
                className="border-t border-border"
              />
            )}
          </ListCard>

          {/* Deleting your own account. Last in the rail and visually apart,
              the way irreversible things should be - but present, because
              erasure isn't a staff-only right and a volunteer who never
              installs the app would otherwise have nowhere to do it. */}
          <ListCard variant="danger" title="Delete account">
            <ListCardBody className="pt-4">
              <DeleteAccountCard />
            </ListCardBody>
          </ListCard>
        </div>
      </div>
    </div>
  );
}

function LeaveSummaryCard({ leave }: { leave: LeaveOverview }) {
  const ahead = [...(leave.current ? [leave.current] : []), ...leave.upcoming];

  return (
    <ListCard
      title="Wā okioki · Leave"
      action={{
        label: ahead.length > 0 ? "Manage" : "Log leave",
        href: "/profile/leave",
      }}
    >
      {ahead.length > 0 ? (
        <BleedList>
          {ahead.slice(0, 3).map((item) => (
            <li key={item.id} className="flex items-center gap-3 px-5 py-3">
              <IconChip size="sm" tone={item === leave.current ? "warning" : "info"}>
                <RiSuitcaseLine />
              </IconChip>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold tnum">
                  {formatLeaveRange(item, leave.today)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {describeLeaveStatus(item, leave.today)}
                </p>
              </div>
            </li>
          ))}
        </BleedList>
      ) : (
        <ListCardBody>
          <p className="text-sm text-muted-foreground">
            Going away? Log it here and we&apos;ll take you off the roster
            while you&apos;re gone.
          </p>
        </ListCardBody>
      )}
    </ListCard>
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
