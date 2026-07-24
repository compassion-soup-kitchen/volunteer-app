"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";

export type StartImpersonationResult = { ok: true } | { error: string };

/**
 * Validates that the signed-in admin may impersonate `targetUserId` and reports
 * a clear, human-facing reason when they can't. It does *not* mutate the
 * session: the token swap happens in the `jwt` callback, driven by the client's
 * `useSession().update({ impersonate })` call, which re-enforces every check
 * here against the signed token (this action only exists to produce a good error
 * toast). Kept in sync with `applyImpersonationUpdate` in impersonation.ts.
 */
export async function startImpersonation(
  targetUserId: string
): Promise<StartImpersonationResult> {
  const session = await auth();

  if (session?.user?.impersonator) {
    return { error: "Return to your own account before impersonating someone else." };
  }
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { error: "Only admins can view the app as another person." };
  }
  if (targetUserId === session.user.id) {
    return { error: "You can't impersonate yourself." };
  }

  const target = await getDb().user.findUnique({
    where: { id: targetUserId },
    select: { role: true, status: true },
  });

  if (!target) {
    return { error: "That person's account no longer exists." };
  }
  if (target.status === "ARCHIVED") {
    return { error: "You can't impersonate an archived account." };
  }
  if (target.role === "ADMIN") {
    return { error: "You can't impersonate another admin." };
  }

  return { ok: true };
}

/**
 * Marks the layout tree stale so the impersonation banner clears once the client
 * has swapped the token back via `useSession().update({ stopImpersonating })`.
 * The actual identity restore lives in the `jwt` callback; anyone may call this
 * (it only ever de-escalates).
 */
export async function stopImpersonation(): Promise<void> {
  revalidatePath("/", "layout");
}
