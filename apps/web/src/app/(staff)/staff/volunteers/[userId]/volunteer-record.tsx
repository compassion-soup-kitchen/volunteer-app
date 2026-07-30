import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BleedList,
  DetailList,
  type DetailFact,
} from "@/components/brand/detail-list";
import { GroupBadges } from "@/components/brand/group-badge";
import { IconChip } from "@/components/brand/icon-chip";
import { StatFigure } from "@/components/brand/stat-figure";
import { StatusBadge } from "@/components/brand/status-badge";
import {
  RiAlarmWarningLine,
  RiArrowRightLine,
  RiCakeLine,
  RiCalendarLine,
  RiGraduationCapLine,
  RiGroupLine,
  RiHeartLine,
  RiMailLine,
  RiMapPinLine,
  RiPhoneLine,
  RiRestaurantLine,
  RiShieldCheckLine,
  RiTimeLine,
  RiUserHeartLine,
  RiUserLine,
} from "@remixicon/react";
import { agreementLabel } from "@/lib/agreement-labels";
import {
  formatDateOnly,
  formatTimestampInAppZone,
  timestampToDateOnly,
  todayInAppZone,
} from "@/lib/date-only";
import { ageInYears, summariseAvailability } from "@/lib/volunteer-detail";
import type {
  VolunteerDetail,
  VolunteerDetailShift,
} from "@/lib/staff-actions";
import { VolunteerDocuments } from "./volunteer-documents";

const ROLE_LABEL: Record<string, string> = {
  PUBLIC: "No role yet",
  VOLUNTEER: "Volunteer",
  COORDINATOR: "Coordinator",
  ADMIN: "Admin",
};

const NOT_PROVIDED = (
  <span className="font-normal text-muted-foreground">Not provided</span>
);

/**
 * The staff-side read of one person: the same facts a volunteer sees on their
 * own profile, plus the things only staff need - emergency contact, vetting,
 * their record of shifts and training, and the account behind it all.
 *
 * Read-only by design. Everything that *changes* a volunteer (status, role,
 * groups, archiving) stays in one place - the directory's row menu - so there
 * is never a question of which control is authoritative.
 */
export function VolunteerRecord({ detail }: { detail: VolunteerDetail }) {
  const { user, profile, hours, training } = detail;

  if (!profile) {
    return <NoApplicationYet detail={detail} />;
  }

  const availability = summariseAvailability(profile.availability);
  const age = profile.dateOfBirth
    ? ageInYears(timestampToDateOnly(profile.dateOfBirth), todayInAppZone())
    : null;
  const latestApplication = profile.applications[0] ?? null;

  const contactFacts: DetailFact[] = [
    {
      label: "Email",
      icon: RiMailLine,
      value: (
        <a href={`mailto:${user.email}`} className="hover:text-primary hover:underline">
          {user.email}
        </a>
      ),
    },
    {
      label: "Phone",
      icon: RiPhoneLine,
      value: profile.phone ? (
        <a href={`tel:${profile.phone}`} className="hover:text-primary hover:underline">
          {profile.phone}
        </a>
      ) : (
        NOT_PROVIDED
      ),
    },
    {
      label: "Address",
      icon: RiMapPinLine,
      value: profile.address || NOT_PROVIDED,
    },
    {
      label: "Date of birth",
      icon: RiCakeLine,
      value: profile.dateOfBirth ? (
        <>
          {formatTimestampInAppZone(profile.dateOfBirth, {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
          {age !== null && (
            <span className="ml-1.5 font-normal text-muted-foreground">
              ({age})
            </span>
          )}
        </>
      ) : (
        NOT_PROVIDED
      ),
    },
  ];

  const emergencyFacts: DetailFact[] = [
    {
      label: "Name",
      icon: RiUserLine,
      value: profile.emergencyContactName || NOT_PROVIDED,
    },
    {
      label: "Phone",
      icon: RiPhoneLine,
      value: profile.emergencyContactPhone ? (
        <a
          href={`tel:${profile.emergencyContactPhone}`}
          className="hover:text-primary hover:underline"
        >
          {profile.emergencyContactPhone}
        </a>
      ) : (
        NOT_PROVIDED
      ),
    },
    {
      label: "Relationship",
      icon: RiUserHeartLine,
      value: profile.emergencyContactRelationship || NOT_PROVIDED,
    },
  ];

  const hasEmergencyContact = Boolean(
    profile.emergencyContactName || profile.emergencyContactPhone
  );

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Left column — who they are and their record with us */}
      <div className="space-y-4 lg:col-span-2">
        <Card>
          <CardHeader>
            <SectionTitle icon={RiUserLine}>Contact details</SectionTitle>
          </CardHeader>
          <DetailList facts={contactFacts} />
        </Card>

        {/* Emergency contact — the one thing a coordinator may need in a hurry,
            so a missing one is called out rather than left as three quiet
            "Not provided" rows. */}
        <Card>
          <CardHeader>
            <SectionTitle
              icon={RiAlarmWarningLine}
              tone={hasEmergencyContact ? "warning" : "destructive"}
            >
              Emergency contact
            </SectionTitle>
          </CardHeader>
          {hasEmergencyContact ? (
            <DetailList facts={emergencyFacts} />
          ) : (
            <CardContent className="border-t border-border pt-4">
              <p className="text-sm text-muted-foreground">
                No emergency contact on file. Worth asking for one before their
                next shift.
              </p>
            </CardContent>
          )}
        </Card>

        <Card>
          <CardHeader>
            <SectionTitle icon={RiHeartLine} tone="brand">
              Interests &amp; skills
            </SectionTitle>
          </CardHeader>
          <CardContent className="space-y-4 border-t border-border pt-4">
            <div>
              <p className="eyebrow mb-1.5 text-[0.62rem] text-muted-foreground">
                Service area interests
              </p>
              <div className="flex flex-wrap gap-1.5">
                {profile.interests.length > 0 ? (
                  profile.interests.map((area) => (
                    <Badge key={area.id} variant="outline">
                      {area.name}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">
                    None selected
                  </span>
                )}
              </div>
            </div>
            <div>
              <p className="eyebrow mb-1.5 text-[0.62rem] text-muted-foreground">
                Skills
              </p>
              <div className="flex flex-wrap gap-1.5">
                {profile.skills.length > 0 ? (
                  profile.skills.map((skill) => (
                    <Badge key={skill} variant="secondary">
                      {skill}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">
                    None listed
                  </span>
                )}
              </div>
            </div>
            <div>
              <p className="eyebrow mb-1 text-[0.62rem] text-muted-foreground">
                About themselves
              </p>
              {profile.bio ? (
                <p className="text-sm">{profile.bio}</p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nothing written yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <SectionTitle icon={RiCalendarLine}>Availability</SectionTitle>
          </CardHeader>
          {availability.length > 0 ? (
            <BleedList>
              {availability.map((day) => (
                <li
                  key={day.key}
                  className="flex items-center justify-between gap-3 px-5 py-2.5"
                >
                  <span className="text-sm font-semibold">{day.label}</span>
                  <span className="flex flex-wrap justify-end gap-1.5">
                    {day.slots.map((slot) => (
                      <Badge key={slot} variant="neutral" className="capitalize">
                        {slot}
                      </Badge>
                    ))}
                  </span>
                </li>
              ))}
            </BleedList>
          ) : (
            <EmptyRow>No availability set.</EmptyRow>
          )}
        </Card>

        {/* Upcoming and past are two questions - "am I rostering around
            them?" and "have they been turning up?" - so they get a card each.
            Read as one date-sorted list, a fortnight of bookings ahead would
            push the whole attendance history off the page. */}
        <Card>
          <CardHeader>
            <SectionTitle icon={RiCalendarLine}>Upcoming shifts</SectionTitle>
          </CardHeader>
          {profile.upcomingShifts.length > 0 ? (
            <BleedList>
              {profile.upcomingShifts.map((shift) => (
                <ShiftRow key={shift.id} shift={shift} />
              ))}
            </BleedList>
          ) : (
            <EmptyRow>Not on the roster for anything coming up.</EmptyRow>
          )}
        </Card>

        <Card>
          <CardHeader>
            <SectionTitle icon={RiTimeLine}>Shift history</SectionTitle>
            {profile.pastShiftCount > profile.recentShifts.length && (
              <CardDescription>
                Showing the {profile.recentShifts.length} most recent of{" "}
                <span className="tnum">{profile.pastShiftCount}</span>.
              </CardDescription>
            )}
          </CardHeader>
          {profile.recentShifts.length > 0 ? (
            <BleedList>
              {profile.recentShifts.map((shift) => (
                <ShiftRow key={shift.id} shift={shift} />
              ))}
            </BleedList>
          ) : (
            <EmptyRow>No shifts yet.</EmptyRow>
          )}
        </Card>

        <Card>
          <CardHeader>
            <SectionTitle icon={RiGraduationCapLine}>
              Whakangungu · Training
            </SectionTitle>
          </CardHeader>
          {training.length > 0 ? (
            <BleedList>
              {training.map((item) => (
                <li key={item.id} className="flex items-center gap-3 px-5 py-3">
                  <IconChip size="sm">
                    <RiGraduationCapLine />
                  </IconChip>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{item.title}</p>
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
                  <StatusBadge className="shrink-0" status={item.status} />
                </li>
              ))}
            </BleedList>
          ) : (
            <EmptyRow>No training sessions yet.</EmptyRow>
          )}
        </Card>

        <Card>
          <CardHeader>
            <SectionTitle icon={RiShieldCheckLine} tone="success">
              Signed agreements
            </SectionTitle>
          </CardHeader>
          {profile.signedAgreements.length > 0 ? (
            <BleedList>
              {profile.signedAgreements.map((agreement) => (
                <li
                  key={agreement.id}
                  className="flex items-center gap-3 px-5 py-3"
                >
                  <IconChip size="sm" tone="success">
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
                      {agreement.documentVersion &&
                        ` · version ${agreement.documentVersion}`}
                    </p>
                  </div>
                  <Badge variant="success" className="shrink-0">
                    Signed
                  </Badge>
                </li>
              ))}
            </BleedList>
          ) : (
            <EmptyRow>No agreements signed yet.</EmptyRow>
          )}
        </Card>

        <VolunteerDocuments documents={profile.documents} />
      </div>

      {/* Right rail — status, standing and the account behind it */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Standing</CardTitle>
            <CardDescription>
              Where they sit in the volunteer journey
            </CardDescription>
          </CardHeader>
          <DetailList
            facts={[
              {
                label: "Volunteer status",
                value: <StatusBadge status={profile.status} />,
              },
              {
                label: "MoJ vetting",
                value: <StatusBadge status={profile.mojStatus} />,
              },
              { label: "Role", value: ROLE_LABEL[user.role] ?? user.role },
            ]}
          />
        </Card>

        {hours && (
          <Card>
            <CardHeader>
              <CardTitle>Their mahi</CardTitle>
              <CardDescription>Counted from attended shifts</CardDescription>
            </CardHeader>
            <CardContent className="border-t border-border pt-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <Stat icon={RiTimeLine} value={hours.totalHours} unit="hrs" label="Hours" />
                <Stat icon={RiCalendarLine} value={hours.totalShifts} label="Shifts" />
                <Stat
                  icon={RiRestaurantLine}
                  value={hours.totalMeals}
                  label="Meals"
                />
              </div>
              {hours.byServiceArea.length > 0 && (
                <ul className="mt-4 space-y-1.5 border-t border-border pt-3">
                  {hours.byServiceArea.map((area) => (
                    <li
                      key={area.serviceAreaId}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span className="min-w-0 truncate text-muted-foreground">
                        {area.serviceAreaName}
                      </span>
                      <span className="tnum shrink-0 font-semibold">
                        {area.hours} hrs
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <SectionTitle icon={RiGroupLine}>Ō rōpū · Groups</SectionTitle>
          </CardHeader>
          <CardContent className="border-t border-border pt-4">
            {profile.groups.length > 0 ? (
              <GroupBadges groups={profile.groups} className="flex" />
            ) : (
              <p className="text-sm text-muted-foreground">
                Not in any group. Groups are set from the directory.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Application</CardTitle>
            {latestApplication && (
              <CardAction>
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/staff/applications/${latestApplication.id}`}>
                    Review
                    <RiArrowRightLine className="size-3.5" />
                  </Link>
                </Button>
              </CardAction>
            )}
          </CardHeader>
          {latestApplication ? (
            <CardContent className="space-y-2 border-t border-border pt-4">
              <StatusBadge status={latestApplication.status} />
              <p className="text-xs text-muted-foreground">
                Submitted{" "}
                {formatTimestampInAppZone(latestApplication.submittedAt, {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
                {latestApplication.reviewedAt &&
                  ` · reviewed ${formatTimestampInAppZone(
                    latestApplication.reviewedAt
                  )}`}
                {latestApplication.reviewedByName &&
                  ` by ${latestApplication.reviewedByName}`}
              </p>
              {latestApplication.notes && (
                <div className="rounded-md bg-secondary/50 px-3 py-2">
                  <p className="eyebrow text-[0.62rem] text-muted-foreground">
                    Review notes · internal
                  </p>
                  <p className="mt-0.5 text-sm">{latestApplication.notes}</p>
                </div>
              )}
              {profile.applications.length > 1 && (
                <p className="text-xs text-muted-foreground">
                  <span className="tnum">{profile.applications.length}</span>{" "}
                  applications on file.
                </p>
              )}
            </CardContent>
          ) : (
            <EmptyRow>
              No application on file - they were added directly.
            </EmptyRow>
          )}
        </Card>

        <AccountCard detail={detail} />
      </div>
    </div>
  );
}

/**
 * Someone who signed in but never applied. There is no profile to read, so the
 * page says so plainly instead of rendering a wall of "Not provided".
 */
function NoApplicationYet({ detail }: { detail: VolunteerDetail }) {
  const { user } = detail;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Card variant="muted">
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2.5">
              <IconChip size="sm">
                <RiUserLine />
              </IconChip>
              <h2 className="font-serif text-xl font-medium tracking-tight">
                No application yet
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">
              {`${user.name || "This person"} has an account but hasn't submitted a volunteer application, so there's no profile to read - no contact details, emergency contact or availability. You can add them as a full volunteer from the directory, which skips the usual application and vetting.`}
            </p>
            <Button asChild variant="outline" size="sm">
              <Link href="/staff/volunteers">
                Back to the directory
                <RiArrowRightLine className="size-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
      <AccountCard detail={detail} />
    </div>
  );
}

function AccountCard({ detail }: { detail: VolunteerDetail }) {
  const { user } = detail;

  const facts: DetailFact[] = [
    {
      label: "Joined",
      value: formatTimestampInAppZone(user.createdAt, {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    },
    {
      label: "Email verified",
      value: user.emailVerified ? (
        formatTimestampInAppZone(user.emailVerified)
      ) : (
        <span className="font-normal text-muted-foreground">Not verified</span>
      ),
    },
    {
      label: "Account",
      value: <StatusBadge status={user.status} />,
    },
  ];

  if (user.archivedAt) {
    facts.push({
      label: "Archived",
      value: (
        <>
          {formatTimestampInAppZone(user.archivedAt)}
          {user.archivedByName && ` by ${user.archivedByName}`}
          {user.archivedReason && (
            <span className="block font-normal text-muted-foreground">
              {user.archivedReason}
            </span>
          )}
        </>
      ),
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account</CardTitle>
      </CardHeader>
      <DetailList facts={facts} />
    </Card>
  );
}

function ShiftRow({ shift }: { shift: VolunteerDetailShift }) {
  return (
    <li className="flex items-center gap-3 px-5 py-3">
      <IconChip size="sm">
        <RiTimeLine />
      </IconChip>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{shift.serviceArea.name}</p>
        <p className="tnum text-xs text-muted-foreground">
          {formatDateOnly(shift.date, {
            weekday: "short",
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
          {" · "}
          {shift.startTime}-{shift.endTime}
        </p>
      </div>
      <StatusBadge className="shrink-0" status={shift.status} />
    </li>
  );
}

function SectionTitle({
  icon: Icon,
  tone,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone?: React.ComponentProps<typeof IconChip>["tone"];
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <IconChip size="sm" tone={tone}>
        <Icon />
      </IconChip>
      <CardTitle>{children}</CardTitle>
    </div>
  );
}

function Stat({
  icon: Icon,
  value,
  unit,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  unit?: string;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <IconChip size="sm">
        <Icon />
      </IconChip>
      <StatFigure size="md" value={value} unit={unit} />
      <p className="eyebrow text-[0.62rem] text-muted-foreground">{label}</p>
    </div>
  );
}

function EmptyRow({ children }: { children: React.ReactNode }) {
  return (
    <CardContent className="border-t border-border pt-4">
      <p className="text-sm text-muted-foreground">{children}</p>
    </CardContent>
  );
}
