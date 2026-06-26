import { cn } from "@/lib/utils";

/**
 * Eyebrow — the brand's tiny uppercase, letter-spaced section marker.
 * Pair bilingually, e.g. <Eyebrow>Pānui · News</Eyebrow>.
 */
export function Eyebrow({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("eyebrow text-muted-foreground", className)} {...props} />;
}
