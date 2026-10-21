import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

interface PersonAvatarProps extends Omit<React.ComponentProps<typeof Avatar>, "children"> {
  name: string | null | undefined;
  image?: string | null;
  /** Extra classes for the initials, e.g. the serif face on a page header. */
  fallbackClassName?: string;
}

/**
 * PersonAvatar - someone's photo, or their initials on the warm neutral
 * tint. Decorative: the name always sits beside it, so it's hidden from
 * screen readers rather than read out as "M R".
 */
export function PersonAvatar({
  name,
  image,
  fallbackClassName,
  className,
  ...props
}: PersonAvatarProps) {
  return (
    <Avatar aria-hidden className={cn(className)} {...props}>
      {image ? <AvatarImage src={image} alt="" /> : null}
      <AvatarFallback className={fallbackClassName}>{initials(name)}</AvatarFallback>
    </Avatar>
  );
}
