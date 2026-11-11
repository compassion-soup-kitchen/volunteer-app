/**
 * Whether a verified Google or Apple identity may be attached to an existing
 * account that has the same email address but no link to that provider yet.
 *
 * Someone who first signed in with Google and later taps "Sign in with Apple"
 * (or the other way round) expects to land on the account they already have.
 * The provider has just proved they control the mailbox, so the only question
 * is whether the *existing* account's claim on that address was proved too:
 *
 * - **Verified address** - linked. Both sides proved the same mailbox, which
 *   is exactly the proof a password reset relies on, so linking hands nothing
 *   over that an emailed reset link wouldn't.
 * - **Unverified address** - refused. A password account can be registered
 *   against an address nobody has confirmed; adopting it would let whoever
 *   typed someone else's email in first keep a foothold on that person's
 *   account once they arrive with a real proof.
 * - **Offline volunteer** - refused. Staff typed that address in; claiming the
 *   record goes through a password reset, which also clears `isOffline`.
 * - **Archived** - refused as archived, the same as any other way in.
 *
 * Shared by the app's endpoints (`google-accounts`, `apple-accounts`) and the
 * website's NextAuth `signIn` callback, so the two can't disagree.
 */

import type { UserStatus } from "@prisma/client";

export type EmailLinkCandidate = {
  emailVerified: Date | null;
  status: UserStatus;
  isOffline: boolean;
};

export type EmailLinkDecision = "link" | "archived" | "unverified";

export function decideEmailLink(existing: EmailLinkCandidate): EmailLinkDecision {
  if (existing.status === "ARCHIVED") return "archived";
  if (existing.isOffline || !existing.emailVerified) return "unverified";
  return "link";
}
