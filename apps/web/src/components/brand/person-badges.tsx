import { StatusBadge } from "./status-badge";

/** Roles worth a badge. VOLUNTEER is everyone's default, so badging it is noise. */
const BADGED_ROLES = new Set(["COORDINATOR", "ADMIN"]);

/** Whether `role` gets a badge of its own - the kitchen team, not volunteers. */
export function hasRoleBadge(role: string) {
  return BADGED_ROLES.has(role);
}

interface PersonBadgesProps {
  role: string;
  isOffline?: boolean;
  /** `User.status` - only ARCHIVED shows. */
  status?: string;
}

/**
 * PersonBadges - who someone is to the kitchen, beside their name: an
 * elevated role, a record kept for someone without the app, an archived
 * account. Renders a fragment so it sits in whatever flex row holds the name.
 */
export function PersonBadges({ role, isOffline, status }: PersonBadgesProps) {
  return (
    <>
      {hasRoleBadge(role) && <StatusBadge status={role} />}
      {isOffline && <StatusBadge status="OFFLINE" />}
      {status === "ARCHIVED" && <StatusBadge status="ARCHIVED" />}
    </>
  );
}
