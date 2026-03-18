"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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

const STATUS_BADGE_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  PENDING: "default",
  APPROVED: "outline",
  DECLINED: "destructive",
  INFO_REQUESTED: "secondary",
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  DECLINED: "Declined",
  INFO_REQUESTED: "Info requested",
};

const MOJ_LABEL: Record<string, string> = {
  NOT_STARTED: "Not started",
  SUBMITTED: "Submitted",
  CLEARED: "Cleared",
  FLAGGED: "Flagged",
};

const MOJ_BADGE_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  NOT_STARTED: "secondary",
  SUBMITTED: "default",
  CLEARED: "outline",
  FLAGGED: "destructive",
};

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
  const [isPending, startTransition] = useTransition();
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

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Left column — volunteer details */}
      <div className="space-y-4 lg:col-span-2">
        {/* Contact info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <RiUserLine className="size-4" />
              Contact Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted-foreground">Email</dt>
                <dd className="flex items-center gap-1.5 text-sm">
                  <RiMailLine className="size-3.5 text-muted-foreground" />
                  {vol.user.email}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Phone</dt>
                <dd className="flex items-center gap-1.5 text-sm">
                  <RiPhoneLine className="size-3.5 text-muted-foreground" />
                  {vol.phone || "Not provided"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Address</dt>
                <dd className="flex items-center gap-1.5 text-sm">
                  <RiMapPinLine className="size-3.5 text-muted-foreground" />
                  {vol.address || "Not provided"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Date of Birth</dt>
                <dd className="flex items-center gap-1.5 text-sm">
                  <RiCalendarLine className="size-3.5 text-muted-foreground" />
                  {vol.dateOfBirth
                    ? format(vol.dateOfBirth, "d MMMM yyyy")
                    : "Not provided"}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Emergency contact */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Emergency Contact</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 sm:grid-cols-3">
              <div>
                <dt className="text-xs text-muted-foreground">Name</dt>
                <dd className="text-sm">{vol.emergencyContactName || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Phone</dt>
                <dd className="text-sm">{vol.emergencyContactPhone || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Relationship</dt>
                <dd className="text-sm">
                  {vol.emergencyContactRelationship || "—"}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Interests & skills */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <RiHeartLine className="size-4" />
              Interests & Skills
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="mb-1.5 text-xs text-muted-foreground">
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
              <p className="mb-1.5 text-xs text-muted-foreground">Skills</p>
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
                <p className="mb-1 text-xs text-muted-foreground">
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
              <CardTitle className="text-base">Availability</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {Object.entries(DAY_LABELS).map(([key, label]) => {
                  const times = availability[key];
                  if (!times || times.length === 0) return null;
                  return (
                    <div key={key}>
                      <p className="text-xs font-medium">{label}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {times.join(", ")}
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Agreements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <RiShieldCheckLine className="size-4" />
              Signed Agreements
            </CardTitle>
          </CardHeader>
          <CardContent>
            {vol.signedAgreements.length > 0 ? (
              <div className="space-y-2">
                {vol.signedAgreements.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                  >
                    <span>
                      {a.agreementType
                        .replace(/_/g, " ")
                        .toLowerCase()
                        .replace(/\b\w/g, (c) => c.toUpperCase())}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(a.signedAt, "d MMM yyyy")}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No agreements signed yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right column — actions */}
      <div className="space-y-4">
        {/* Status card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Application Status</CardTitle>
            <CardDescription>
              Submitted{" "}
              {format(application.submittedAt, "d MMM yyyy 'at' h:mm a")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Badge
              variant={STATUS_BADGE_VARIANT[application.status] || "secondary"}
              className="text-sm"
            >
              {STATUS_LABEL[application.status] || application.status}
            </Badge>

            {application.reviewedAt && application.reviewedBy && (
              <p className="text-xs text-muted-foreground">
                Reviewed by {application.reviewedBy.name} on{" "}
                {format(application.reviewedAt, "d MMM yyyy")}
              </p>
            )}
          </CardContent>
        </Card>

        {/* MOJ status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">MOJ Vetting</CardTitle>
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
            <CardTitle className="text-base">Review Notes</CardTitle>
            <CardDescription>
              Internal notes — not visible to volunteer
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
              <CardTitle className="text-base">Decision</CardTitle>
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
                      Confirm Approval
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
                Request More Info
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    className="w-full"
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
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isSaving && (
                        <RiLoader4Line className="mr-2 size-4 animate-spin" />
                      )}
                      Confirm Decline
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-4">
              <p className="text-center text-sm text-muted-foreground">
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
