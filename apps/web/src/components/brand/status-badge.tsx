import { Badge, badgeVariants } from "@/components/ui/badge";
import type { VariantProps } from "class-variance-authority";

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

/**
 * One shared reading of every workflow status in the app, so the same state
 * always carries the same colour: affirmative → green, waiting → ochre,
 * in-motion → navy info, stopped/urgent → oxblood, dormant → warm neutral.
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
  // Shifts & training
  SIGNED_UP: "info",
  REGISTERED: "info",
  ATTENDED: "success",
  COMPLETED: "success",
  NO_SHOW: "destructive",
  CANCELLED: "neutral",
};

const STATUS_LABELS: Record<string, string> = {
  APPROVED_FOR_INDUCTION: "Ready for induction",
  APPLICATION_SUBMITTED: "Application submitted",
  AWAITING_VETTING: "Awaiting vetting",
  INFO_REQUESTED: "Info requested",
  NOT_STARTED: "Not started",
  SIGNED_UP: "Signed up",
  NO_SHOW: "No-show",
  MOJ_SUBMITTED: "MoJ submitted",
};

function prettify(status: string) {
  const label = STATUS_LABELS[status];
  if (label) return label;
  const words = status.replaceAll("_", " ").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

interface StatusBadgeProps extends Omit<React.ComponentProps<typeof Badge>, "variant"> {
  status: string;
  /** Override the derived label (e.g. add a count). */
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
