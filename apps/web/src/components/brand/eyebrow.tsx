import { cn } from "@/lib/utils";

/**
 * Eyebrow — the brand's tiny uppercase, letter-spaced overline marker.
 * Defaults to Pūaroha red (the app's most identity-defining repeated element);
 * pass a text-* class for quiet (text-muted-foreground) or on-ink
 * (text-ink-muted-foreground) contexts. Pair bilingually, e.g.
 * <Eyebrow>Pānui · News</Eyebrow>.
 */
export function Eyebrow({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("eyebrow text-primary", className)} {...props} />;
}
