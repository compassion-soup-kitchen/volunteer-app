import { RiEyeLine } from "@remixicon/react";
import { auth } from "@/lib/auth";
import { ImpersonationReturnButton } from "./impersonation-return-button";

/**
 * A sticky, unmistakable-but-not-alarming bar shown whenever an admin is
 * viewing the app as another user. Renders nothing for ordinary sessions. Lives
 * in the root layout so it appears across both the volunteer and staff trees
 * (an admin may be impersonating a coordinator, who lands in /staff).
 */
export async function ImpersonationBanner() {
  const session = await auth();
  const impersonator = session?.user?.impersonator;
  if (!impersonator) return null;

  const viewingAs = session?.user?.name?.trim() || session?.user?.email || "this person";
  const you = impersonator.name?.trim() || impersonator.email || "an admin";

  return (
    <div
      role="status"
      className="sticky top-0 z-[100] flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-b border-warning-foreground/15 bg-warning px-4 py-2.5 text-warning-foreground"
    >
      <p className="flex items-center gap-2 text-sm">
        <RiEyeLine className="size-4 shrink-0" aria-hidden />
        <span>
          You&apos;re viewing as{" "}
          <span className="font-semibold">{viewingAs}</span>
          <span className="hidden sm:inline"> · signed in as {you}</span>
        </span>
      </p>
      <ImpersonationReturnButton />
    </div>
  );
}
