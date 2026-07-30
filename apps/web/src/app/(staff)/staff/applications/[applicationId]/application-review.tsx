"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { StatusBadge } from "@/components/brand/status-badge";
import { IconChip } from "@/components/brand/icon-chip";
import {
  BleedList,
  DetailList,
  type DetailFact,
} from "@/components/brand/detail-list";
import {
  RiCheckLine,
  RiCloseLine,
  RiQuestionLine,
  RiLoader4Line,
  RiMailLine,
  RiPhoneLine,
  RiMapPinLine,
  RiCalendarLine,
  RiShieldCheckLine,
  RiUserLine,
  RiHeartLine,
} from "@remixicon/react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  reviewApplication,
  updateMojStatus,
  type ApplicationDetail,
} from "@/lib/staff-actions";

const DAY_LABELS: Record<string, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

interface ApplicationReviewProps {
  application: ApplicationDetail;
}

export function ApplicationReview({ application }: ApplicationReviewProps) {
  const router = useRouter();
  const [notes, setNotes] = useState(application.notes || "");
  const [isSaving, setIsSaving] = useState(false);
  const [, startTransition] = useTransition();
  const [mojStatus, setMojStatus] = useState(application.volunteer.mojStatus);

  const vol = application.volunteer;
  const availability = vol.availability as Record<string, string[]> | null;

  async function handleDecision(
    decision: "APPROVED" | "DECLINED" | "INFO_REQUESTED"
  ) {
    setIsSaving(true);
    const result = await reviewApplication(application.id, decision, notes);
    setIsSaving(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    const labels = {
      APPROVED: "Application approved — the volunteer can now sign up for shifts.",
      DECLINED: "Application declined.",
      INFO_REQUESTED: "More information requested from applicant.",
    };

    toast.success(labels[decision]);
    router.push("/staff/applications");
    router.refresh();
  }

  async function handleMojUpdate(newStatus: string) {
    setMojStatus(newStatus);
    startTransition(async () => {
      const result = await updateMojStatus(
        vol.id,
        newStatus as "NOT_STARTED" | "SUBMITTED" | "CLEARED" | "FLAGGED"
      );
      if (result.error) {
        toast.error(result.error);
        setMojStatus(application.volunteer.mojStatus);
      } else {
        toast.success("MOJ status updated.");
      }
    });
  }

  const contactFacts: DetailFact[] = [
    { label: "Email", value: vol.user.email, icon: RiMailLine },
    { label: "Phone", value: vol.phone || "Not provided", icon: RiPhoneLine },
    { label: "Address", value: vol.address || "Not provided", icon: RiMapPinLine },
    {
      label: "Date of birth",
      value: vol.dateOfBirth
        ? format(vol.dateOfBirth, "d MMMM yyyy")
        : "Not provided",
      icon: RiCalendarLine,
    },
  ];

  const emergencyFacts: DetailFact[] = [
    { label: "Name", value: vol.emergencyContactName || "Not provided" },
    { label: "Phone", value: vol.emergencyContactPhone || "Not provided" },
    {
      label: "Relationship",
      value: vol.emergencyContactRelationship || "Not provided",
    },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Left column — the applicant's story */}
      <div className="space-y-4 lg:col-span-2">
        {/* Contact details */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <IconChip size="sm">
                <RiUserLine />
              </IconChip>
              <CardTitle>Contact details</CardTitle>
            </div>
          </CardHeader>
          <DetailList facts={contactFacts} />
        </Card>

        {/* Emergency contact */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <IconChip size="sm">
                <RiPhoneLine />
              </IconChip>
              <CardTitle>Emergency contact</CardTitle>
            </div>
          </CardHeader>
          <DetailList facts={emergencyFacts} />
        </Card>

        {/* Interests & skills */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <IconChip size="sm" tone="brand">
                <RiHeartLine />
              </IconChip>
              <CardTitle>Interests &amp; skills</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 border-t border-border pt-4">
            <div>
              <p className="eyebrow mb-1.5 text-[0.62rem] text-muted-foreground">
                Service area interests
              </p>
              <div className="flex flex-wrap gap-1.5">
                {vol.interests.length > 0 ? (
                  vol.interests.map((i) => (
                    <Badge key={i.id} variant="outline">
                      {i.name}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">None selected</span>
                )}
              </div>
            </div>
            <div>
              <p className="eyebrow mb-1.5 text-[0.62rem] text-muted-foreground">
                Skills
              </p>
              <div className="flex flex-wrap gap-1.5">
                {vol.skills.length > 0 ? (
                  vol.skills.map((s) => (
                    <Badge key={s} variant="secondary">
                      {s}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">None listed</span>
                )}
              </div>
            </div>
            {vol.bio && (
              <div>
                <p className="eyebrow mb-1 text-[0.62rem] text-muted-foreground">
                  About themselves
                </p>
                <p className="text-sm">{vol.bio}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Availability */}
        {availability && Object.keys(availability).length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <IconChip size="sm">
                  <RiCalendarLine />
                </IconChip>
                <CardTitle>Availability</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="border-t border-border pt-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {Object.entries(DAY_LABELS).map(([key, label]) => {
                  const times = availability[key];
                  if (!times || times.length === 0) return null;
                  return (
                    <div key={key}>
                      <p className="eyebrow text-[0.62rem] text-muted-foreground">
                        {label}
                      </p>
                      <p className="text-sm font-medium capitalize">
                        {times.join(", ")}
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Signed agreements */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <IconChip size="sm" tone="success">
                <RiShieldCheckLine />
              </IconChip>
              <CardTitle>Signed agreements</CardTitle>
            </div>
          </CardHeader>
          {vol.signedAgreements.length > 0 ? (
            <BleedList>
              {vol.signedAgreements.map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-5 py-3">
                  <IconChip size="sm" tone="success">
                    <RiCheckLine />
                  </IconChip>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {a.agreementType
                      .replace(/_/g, " ")
                      .toLowerCase()
                      .replace(/\b\w/g, (c) => c.toUpperCase())}
                  </span>
                  <span className="tnum shrink-0 text-xs text-muted-foreground">
                    {format(a.signedAt, "d MMM yyyy")}
                  </span>
                </li>
              ))}
            </BleedList>
          ) : (
            <CardContent className="border-t border-border pt-4">
              <p className="text-sm text-muted-foreground">
                No agreements signed yet.
              </p>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Right column — status & actions */}
      <div className="space-y-4">
        {/* Status card */}
        <Card>
          <CardHeader>
            <CardTitle>Application status</CardTitle>
            <CardDescription>
              Submitted{" "}
              {format(application.submittedAt, "d MMM yyyy 'at' h:mm a")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <StatusBadge status={application.status} className="text-sm" />

            {application.reviewedAt && application.reviewedBy && (
              <p className="text-xs text-muted-foreground">
                Reviewed by {application.reviewedBy.name} on{" "}
                {format(application.reviewedAt, "d MMM yyyy")}
              </p>
            )}
          </CardContent>
        </Card>

        {/* MoJ status */}
        <Card>
          <CardHeader>
            <CardTitle>MoJ vetting</CardTitle>
            <CardDescription>
              Ministry of Justice background check
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={mojStatus} onValueChange={handleMojUpdate}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NOT_STARTED">Not started</SelectItem>
                <SelectItem value="SUBMITTED">Submitted</SelectItem>
                <SelectItem value="CLEARED">Cleared</SelectItem>
                <SelectItem value="FLAGGED">Flagged</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Review notes</CardTitle>
            <CardDescription>
              Internal only · not visible to the volunteer
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this application..."
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Decision buttons */}
        {application.status === "PENDING" ||
        application.status === "INFO_REQUESTED" ? (
          <Card>
            <CardHeader>
              <CardTitle>Decision</CardTitle>
              <CardDescription>
                Take action on this application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button className="w-full" disabled={isSaving}>
                    <RiCheckLine className="size-4" />
                    Approve
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Approve application?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will set the volunteer&apos;s status to &quot;Approved for
                      Induction&quot; and grant them access to sign up for shifts.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDecision("APPROVED")}
                    >
                      {isSaving && (
                        <RiLoader4Line className="mr-2 size-4 animate-spin" />
                      )}
                      Confirm approval
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Button
                variant="outline"
                className="w-full"
                disabled={isSaving}
                onClick={() => handleDecision("INFO_REQUESTED")}
              >
                <RiQuestionLine className="size-4" />
                Request more info
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full border-destructive/40 text-destructive hover:bg-destructive-tint hover:text-destructive"
                    disabled={isSaving}
                  >
                    <RiCloseLine className="size-4" />
                    Decline
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Decline application?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will mark the application as declined and set the
                      volunteer&apos;s status to inactive.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDecision("DECLINED")}
                      variant="destructive"
                    >
                      {isSaving && (
                        <RiLoader4Line className="mr-2 size-4 animate-spin" />
                      )}
                      Confirm decline
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex items-center gap-3">
              <IconChip
                size="sm"
                tone={application.status === "APPROVED" ? "success" : "destructive"}
              >
                {application.status === "APPROVED" ? (
                  <RiCheckLine />
                ) : (
                  <RiCloseLine />
                )}
              </IconChip>
              <p className="text-sm text-muted-foreground">
                This application has been{" "}
                {application.status === "APPROVED" ? "approved" : "declined"}.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
