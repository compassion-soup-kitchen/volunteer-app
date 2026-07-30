import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiAuth } from "@/lib/api/auth";
import {
  eraseUserAccount,
  loadAccountErasureFacts,
} from "@/lib/data/account-erasure";
import {
  summariseOwnAccountDeletion,
  validateSelfDeletion,
} from "@/lib/user-deletion";

/**
 * Deleting your own account from the mobile app.
 *
 * Two steps, deliberately: `GET` says what erasing this account would destroy
 * so the app can show it before anything happens, and `DELETE` does it once
 * the person has typed their own email address back. Same rules and same
 * erasure as the web (`account-actions.deleteOwnAccount`) - both go through
 * `@/lib/user-deletion` and `@/lib/data/account-erasure`.
 *
 * App Store guideline 5.1.1(v) requires this to be reachable *in the app*:
 * no website hand-off, no "email the team". The only thing that can refuse is
 * being the last admin, which the summary reports up front as a `blocker` so
 * the app can explain it rather than fail at the last tap.
 */

const confirmSchema = z.object({
  // The account's own email, typed back. Length-capped so an unbounded body
  // never reaches the comparison.
  confirmation: z.string().min(1).max(320),
});

export const GET = withApiAuth(async (_req, user) => {
  const facts = await loadAccountErasureFacts(user.id);
  if (!facts) {
    return NextResponse.json(
      { error: "That account no longer exists." },
      { status: 404 }
    );
  }
  return NextResponse.json(summariseOwnAccountDeletion(facts));
});

export const DELETE = withApiAuth(async (req, user) => {
  const body = await req.json().catch(() => null);
  const parsed = confirmSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Type your email address exactly to confirm." },
      { status: 400 }
    );
  }

  const facts = await loadAccountErasureFacts(user.id);
  if (!facts) {
    return NextResponse.json(
      { error: "That account no longer exists." },
      { status: 404 }
    );
  }

  const validationError = validateSelfDeletion({
    isLastAdmin: facts.isLastAdmin,
    email: facts.email,
    confirmation: parsed.data.confirmation,
  });
  if (validationError) {
    // 409, not 400: for the last-admin case nothing about the request is
    // malformed - the account is simply in a state that has to change first.
    return NextResponse.json({ error: validationError }, { status: 409 });
  }

  const result = await eraseUserAccount(facts, facts.userId);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  // The bearer token outlives the row it names, but `authenticateApiRequest`
  // re-reads the user on every call, so it is already worthless.
  return NextResponse.json({ success: true });
});
