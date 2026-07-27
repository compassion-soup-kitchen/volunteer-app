import { Badge } from "@/components/ui/badge";
import { trainingTypeTone } from "@/lib/training-types";

/**
 * The badge for a training type, wherever one is shown.
 *
 * Training types used to be a fixed enum, and every screen carried its own copy
 * of the label and colour maps. Now that staff can add their own, the name
 * comes from the database and the colour from the type's key.
 */
export function TrainingTypeBadge({
  type,
  className,
}: {
  type: { key: string; name: string };
  className?: string;
}) {
  return (
    <Badge variant={trainingTypeTone(type.key)} className={className}>
      {type.name}
    </Badge>
  );
}
