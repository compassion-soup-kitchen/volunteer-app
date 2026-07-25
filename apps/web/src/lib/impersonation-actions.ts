"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import {
  checkImpersonationTarget,
  checkImpersonatorAuthority,
} from "@/lib/impersonation";

export type StartImpersonationResult = { ok: true } | { error: string };

/**
 * Validates that the signed-in admin may impersonate `targetUserId` and reports
 * a clear, human-facing reason when they can't. It does *not* mutate the
 * session: the token swap happens in the `jwt` callback, driven by the client's
 * `useSession().update({ impersonate })` call, which re-enforces every check
 * here against the signed token (this action only exists to produce a good error
 * toast). Both paths share `checkImpersonatorAuthority` / `checkImpersonationTarget`
 * (unit-tested in impersonation.test.ts) so the toast can't disagree with what
 * the `jwt` callback actually does.
 */
export async function startImpersonation(
  targetUserId: string
): Promise<StartImpersonationResult> {
  const session = await auth();

  const authority = checkImpersonatorAuthority({
    actorRole: session?.user?.role,
    actorIsImpersonating: Boolean(session?.user?.impersonator),
    actorId: session?.user?.id ?? "",
    targetId: targetUserId,
  });
  if (!authority.ok) return { error: authority.message };

  // Only reachable once the actor is a genuine, non-impersonating admin.
  const target = await getDb().user.findUnique({
    where: { id: targetUserId },
    select: { role: true, status: true },
  });

  const targetCheck = checkImpersonationTarget(target);
  if (!targetCheck.ok) return { error: targetCheck.message };

  return { ok: true };
}

/**
 * Marks the layout tree stale so the impersonation banner clears once the client
 * has swapped the token back via `useSession().update({ stopImpersonating })`.
 * The actual identity restore lives in the `jwt` callback; this only
 * de-escalates, but we still require a session for parity with the rest of the
 * codebase ("always check in server actions").
 */
export async function stopImpersonation(): Promise<void> {
  const session = await auth();
  if (!session?.user) return;
  revalidatePath("/", "layout");
}
