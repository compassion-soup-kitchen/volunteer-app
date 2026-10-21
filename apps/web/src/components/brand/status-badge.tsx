import { Badge, badgeVariants } from "@/components/ui/badge";
import type { VariantProps } from "class-variance-authority";

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

/**
 * One shared reading of every workflow status in the app, so the same state
 * always carries the same colour: affirmative → green, waiting → ochre,
 * in-motion → navy info, stopped/urgent → oxblood, dormant → warm neutral.
 *
 * This is the only place a status picks its colour. Where one word means
 * different things in different places (a cancelled shift is the volunteer's
 * own choice, a cancelled event is called off), the key is namespaced.
 */
const STATUS_VARIANTS: Record<string, BadgeVariant> = {
  // Volunteer lifecycle
  ACTIVE: "success",
  APPROVED: "success",
  APPROVED_FOR_INDUCTION: "info",
  APPLICATION_SUBMITTED: "info",
  AWAITING_VETTING: "warning",
  INACTIVE: "neutral",
  ARCHIVED: "neutral",
  NO_APPLICATION: "outline",
  // Who someone is to the kitchen
  ADMIN: "default",
  COORDINATOR: "info",
  STAFF: "info",
  OFFLINE: "neutral",
  // MoJ vetting
  CLEARED: "success",
  NOT_STARTED: "neutral",
  SUBMITTED: "info",
  FLAGGED: "destructive",
  // Applications
  PENDING: "warning",
  DECLINED: "destructive",
  INFO_REQUESTED: "info",
  // Documents
  SIGNED: "success",
  CONFIRMED: "success",
  NEEDS_CONFIRMING: "warning",
  OUTDATED: "neutral",
  RETIRED: "neutral",
  // Shifts & training
  SIGNED_UP: "info",
  REGISTERED: "info",
  ATTENDED: "success",
  COMPLETED: "success",
  NO_SHOW: "destructive",
  CANCELLED: "neutral",
  PAST: "neutral",
  ATTENDANCE_DUE: "warning",
  // First refusal: a shift held for its regulars, and their answers
  HELD: "warning",
  HELD_FOR_OTHERS: "neutral",
  OPEN: "neutral",
  OFFER_PENDING: "warning",
  OFFER_ACCEPTED: "success",
  OFFER_DECLINED: "neutral",
  // Leave
  ON_LEAVE: "warning",
  LEAVE_CURRENT: "warning",
  LEAVE_UPCOMING: "info",
  LEAVE_PAST: "neutral",
  // Events and replies
  EVENT_DRAFT: "neutral",
  EVENT_PUBLISHED: "success",
  EVENT_CANCELLED: "destructive",
  RSVP_GOING: "success",
  RSVP_MAYBE: "warning",
  RSVP_NOT_GOING: "neutral",
};

const STATUS_LABELS: Record<string, string> = {
  APPROVED_FOR_INDUCTION: "Ready for induction",
  APPLICATION_SUBMITTED: "Application submitted",
  AWAITING_VETTING: "Awaiting vetting",
  NO_APPLICATION: "No application yet",
  INFO_REQUESTED: "Info requested",
  NOT_STARTED: "Not started",
  NEEDS_CONFIRMING: "Read and confirm",
  SIGNED_UP: "Signed up",
  NO_SHOW: "No-show",
  ATTENDANCE_DUE: "Mark attendance",
  HELD_FOR_OTHERS: "Held",
  OFFER_PENDING: "Yet to answer",
  OFFER_ACCEPTED: "Taking it",
  OFFER_DECLINED: "Passed",
  MOJ_SUBMITTED: "MoJ submitted",
  LEAVE_CURRENT: "Away now",
  LEAVE_UPCOMING: "Coming up",
  LEAVE_PAST: "Back",
  EVENT_DRAFT: "Draft",
  EVENT_PUBLISHED: "Shared",
  EVENT_CANCELLED: "Cancelled",
};

function prettify(status: string) {
  const label = STATUS_LABELS[status];
  if (label) return label;
  const words = status.replaceAll("_", " ").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

interface StatusBadgeProps extends Omit<React.ComponentProps<typeof Badge>, "variant"> {
  status: string;
  /** Override the derived label (e.g. add a count or an icon). */
  label?: React.ReactNode;
}

/** StatusBadge — a tinted pill coloured by the shared status semantics. */
export function StatusBadge({ status, label, ...props }: StatusBadgeProps) {
  return (
    <Badge variant={STATUS_VARIANTS[status] ?? "neutral"} {...props}>
      {label ?? prettify(status)}
    </Badge>
  );
}
