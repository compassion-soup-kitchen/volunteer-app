"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RiArrowGoBackLine, RiLoader4Line } from "@remixicon/react";
import { Button } from "@/components/ui/button";
import { stopImpersonation } from "@/lib/impersonation-actions";

/**
 * Ends impersonation and returns the admin to their own account. The token swap
 * happens in the `jwt` callback via `update({ stopImpersonating: true })`; the
 * server action then revalidates so the banner clears and the staff area renders
 * as the admin again.
 */
export function ImpersonationReturnButton() {
  const { update } = useSession();
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleReturn() {
    setPending(true);
    try {
      await update({ stopImpersonating: true });
      await stopImpersonation();
      router.push("/staff/volunteers");
      router.refresh();
    } catch {
      setPending(false);
      toast.error("Couldn't return to your account. Please try again.");
    }
  }

  return (
    <Button
      size="sm"
      onClick={handleReturn}
      disabled={pending}
      className="shrink-0 gap-1.5 bg-warning-foreground text-warning hover:bg-warning-foreground/90"
    >
      {pending ? (
        <RiLoader4Line className="size-4 animate-spin" aria-hidden />
      ) : (
        <RiArrowGoBackLine className="size-4" aria-hidden />
      )}
      Return to your account
    </Button>
  );
}
