import type { Metadata } from "next";
import { connection } from "next/server";
import { auth } from "@/lib/auth";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  RiUserLine,
  RiPhoneLine,
  RiMapPinLine,
  RiCakeLine,
  RiAlarmWarningLine,
  RiCalendarLine,
  RiHeartLine,
  RiToolsLine,
  RiShieldCheckLine,
  RiEditLine,
  RiArrowRightLine,
  RiArrowLeftLine,
  RiGraduationCapLine,
} from "@remixicon/react";
import { getVolunteerProfile } from "@/lib/application-actions";
import { getVolunteerTrainingHistory } from "@/lib/training-actions";
import { ProfileEditForm } from "./profile-edit-form";

export const metadata: Metadata = {
  title: "My Profile | Te Pūaroha",
};

const STATUS_LABELS: Record<string, string> = {
  APPLICATION_SUBMITTED: "Application Submitted",
  AWAITING_VETTING: "Awaiting Vetting",
  APPROVED_FOR_INDUCTION: "Ready for Induction",
  ACTIVE: "Active Volunteer",
  INACTIVE: "Inactive",
};

const DAYS_SHORT: Record<string, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

export default async function ProfilePage() {
  await connection();
  const session = await auth();
  const [profile, trainingHistory] = await Promise.all([
    getVolunteerProfile(),
    getVolunteerTrainingHistory(),
  ]);

  // No profile yet — prompt to apply
  if (!profile) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Profile</h1>
          <p className="text-muted-foreground">
            Kia ora, {session?.user?.name?.split(" ")[0] || "there"}
          </p>
        </div>

        <Card className="border-primary/20 bg-primary/[0.03]">
          <CardHeader>
            <CardTitle>Complete your application first</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Your profile will appear here once you&apos;ve submitted your
              volunteer application.
            </p>
            <Button asChild>
              <Link href="/application">
                Start Application
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
    <div className="mx-auto max-w-2xl space-y-6 pb-24">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="hidden sm:block">
            <Button variant="ghost" size="icon-sm" asChild>
              <Link href="/dashboard">
                <RiArrowLeftLine className="size-4" />
              </Link>
            </Button>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">My Profile</h1>
            <p className="text-muted-foreground">
              Kia ora, {session?.user?.name?.split(" ")[0] || "there"}
            </p>
          </div>
        </div>
        <Badge
          variant={
            profile.status === "ACTIVE" ? "default" : "secondary"
          }
        >
          {STATUS_LABELS[profile.status] || profile.status}
        </Badge>
      </div>

      {/* Contact Details */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-md bg-primary/10">
              <RiUserLine className="size-4 text-primary" />
            </div>
            <CardTitle className="text-base">Contact Details</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <ProfileField
            icon={RiUserLine}
            label="Name"
            value={session?.user?.name || "—"}
          />
          <ProfileField
            icon={RiPhoneLine}
            label="Phone"
            value={profile.phone || "—"}
          />
          <ProfileField
            icon={RiMapPinLine}
            label="Address"
            value={profile.address || "—"}
          />
          <ProfileField
            icon={RiCakeLine}
            label="Date of birth"
            value={
              profile.dateOfBirth
                ? new Date(profile.dateOfBirth).toLocaleDateString("en-NZ", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : "Not provided"
            }
          />
        </CardContent>
      </Card>

      {/* Emergency Contact */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-md bg-primary/10">
              <RiAlarmWarningLine className="size-4 text-primary" />
            </div>
            <CardTitle className="text-base">Emergency Contact</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <ProfileField label="Name" value={profile.emergencyContactName || "—"} />
          <ProfileField label="Phone" value={profile.emergencyContactPhone || "—"} />
          <ProfileField label="Relationship" value={profile.emergencyContactRelationship || "—"} />
        </CardContent>
      </Card>

      {/* Availability */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-md bg-primary/10">
              <RiCalendarLine className="size-4 text-primary" />
            </div>
            <CardTitle className="text-base">Availability</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {availableDays.length > 0 ? (
            <div className="space-y-2">
              {availableDays.map(([day, slots]) => (
                <div key={day} className="flex items-center gap-3">
                  <span className="w-10 text-sm font-medium">
                    {DAYS_SHORT[day] || day}
                  </span>
                  <div className="flex gap-1.5">
                    {(slots as string[]).map((slot) => (
                      <Badge key={slot} variant="outline" className="text-xs capitalize">
                        {slot}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No availability set</p>
          )}
        </CardContent>
      </Card>

      {/* Interests */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-md bg-primary/10">
              <RiHeartLine className="size-4 text-primary" />
            </div>
            <CardTitle className="text-base">Areas of Interest</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {profile.interests.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {profile.interests.map((area) => (
                <Badge key={area.id} variant="secondary">
                  {area.name}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No interests selected</p>
          )}
        </CardContent>
      </Card>

      {/* Skills */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-md bg-primary/10">
              <RiToolsLine className="size-4 text-primary" />
            </div>
            <CardTitle className="text-base">Skills & About</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {profile.skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {profile.skills.map((skill) => (
                <Badge key={skill} variant="outline">
                  {skill}
                </Badge>
              ))}
            </div>
          )}
          {profile.bio && <p className="text-sm">{profile.bio}</p>}
          {profile.skills.length === 0 && !profile.bio && (
            <p className="text-sm text-muted-foreground">No details provided</p>
          )}
        </CardContent>
      </Card>

      {/* Training History */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-md bg-primary/10">
              <RiGraduationCapLine className="size-4 text-primary" />
            </div>
            <CardTitle className="text-base">Whakangungu — Training</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {trainingHistory.length > 0 ? (
            <div className="space-y-2">
              {trainingHistory.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-md border border-border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.date).toLocaleDateString("en-NZ", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                      {" · "}
                      {item.type === "INDUCTION"
                        ? "Induction"
                        : item.type === "DE_ESCALATION"
                          ? "De-escalation"
                          : item.type === "HEALTH_SAFETY"
                            ? "Health & Safety"
                            : "Other"}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      item.status === "ATTENDED"
                        ? "text-xs text-green-600 border-green-200"
                        : item.status === "REGISTERED"
                          ? "text-xs text-blue-600 border-blue-200"
                          : item.status === "NO_SHOW"
                            ? "text-xs text-destructive border-destructive/30"
                            : "text-xs"
                    }
                  >
                    {item.status === "ATTENDED"
                      ? "Completed"
                      : item.status === "REGISTERED"
                        ? "Upcoming"
                        : item.status === "NO_SHOW"
                          ? "Missed"
                          : "Cancelled"}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No training sessions yet
            </p>
          )}
        </CardContent>
      </Card>

      {/* Agreements */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-md bg-primary/10">
              <RiShieldCheckLine className="size-4 text-primary" />
            </div>
            <CardTitle className="text-base">Signed Agreements</CardTitle>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/documents">
              View all
              <RiArrowRightLine className="size-3.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {profile.signedAgreements.length > 0 ? (
            <div className="space-y-2">
              {profile.signedAgreements.map((agreement) => (
                <div
                  key={agreement.id}
                  className="flex items-center justify-between rounded-md border border-border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {agreement.agreementType === "CODE_OF_CONDUCT"
                        ? "Te Tikanga — Code of Conduct"
                        : "Safeguarding Policy"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Signed{" "}
                      {new Date(agreement.signedAt).toLocaleDateString("en-NZ", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs text-green-600 border-green-200">
                    Signed
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No agreements signed</p>
          )}
        </CardContent>
      </Card>

      {/* Edit Section */}
      <Separator />
      <ProfileEditForm profile={profile} />
    </div>
  );
}

function ProfileField({
  icon: Icon,
  label,
  value,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      {Icon && <Icon className="mt-0.5 size-4 text-muted-foreground" />}
      <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
        <span className="text-sm font-medium text-muted-foreground min-w-[100px]">
          {label}
        </span>
        <span className="text-sm">{value}</span>
      </div>
    </div>
  );
}
