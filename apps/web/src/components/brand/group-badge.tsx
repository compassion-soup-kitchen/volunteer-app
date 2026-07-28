import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { groupToneVariant, sortGroups, type GroupChip } from "@/lib/volunteer-groups";

interface GroupBadgeProps extends Omit<React.ComponentProps<typeof Badge>, "variant"> {
  group: Pick<GroupChip, "name" | "tone">;
}

/**
 * One group, in its own colour, wherever a person's name appears. Children
 * override the label when a surface wants to append something (a count, say).
 */
export function GroupBadge({ group, children, ...props }: GroupBadgeProps) {
  return (
    <Badge variant={groupToneVariant(group.tone)} {...props}>
      {children ?? group.name}
    </Badge>
  );
}

interface GroupBadgesProps {
  groups: GroupChip[];
  /** Beyond this many, the rest collapse into a "+2" pill. */
  max?: number;
  className?: string;
}

/**
 * A person's groups as a row of badges, always in the same order so a name
 * reads the same in the directory as it does on the roster.
 */
export function GroupBadges({ groups, max, className }: GroupBadgesProps) {
  if (groups.length === 0) return null;

  const ordered = sortGroups(groups);
  const shown = max ? ordered.slice(0, max) : ordered;
  const hidden = ordered.length - shown.length;

  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1", className)}>
      {shown.map((group) => (
        <GroupBadge key={group.id} group={group} />
      ))}
      {hidden > 0 && (
        <Badge
          variant="neutral"
          className="tnum"
          title={ordered
            .slice(shown.length)
            .map((group) => group.name)
            .join(", ")}
        >
          +{hidden}
        </Badge>
      )}
    </span>
  );
}
