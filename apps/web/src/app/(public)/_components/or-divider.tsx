import { Separator } from "@/components/ui/separator";

/**
 * A labelled rule between a form and its identity providers. The label sits
 * in a gap between two lines rather than on a painted patch, so it reads
 * cleanly whatever surface the form is on, in either theme.
 */
export function OrDivider({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-6 flex items-center gap-3">
      <Separator className="flex-1" />
      <span className="text-xs text-muted-foreground">{children}</span>
      <Separator className="flex-1" />
    </div>
  );
}
