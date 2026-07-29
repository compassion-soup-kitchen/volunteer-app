import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { issueApiToken } from "@/lib/api/token";
import { serializeSessionUser } from "@/lib/api/serializers";
import { signInWithGoogleIdentity } from "@/lib/data/google-accounts";
import { verifyGoogleIdToken } from "@/lib/google-id-token";

/**
 * Google sign-in for the mobile app.
 *
 * The native app completes the Google flow on-device and posts the resulting
 * ID token here; we verify it against Google's keys, map it to an account, and
 * hand back the same bearer token `/api/v1/auth/login` issues.
 *
 * Unlike its sibling `/login`, this route carries no rate limit. That budget
 * exists because bcrypt is a CPU amplifier - a password comparison costs
 * ~278ms, so a flood of guesses is a denial-of-service in its own right.
 * Verifying a signature is ~0.018ms, four orders of magnitude cheaper and no
 * dearer than parsing the JSON body, and a token bearing an unknown key id
 * can't amplify outbound either: `createRemoteJWKSet` refetches Google's keys
 * at most once per cooldown window. The remaining budget-worthy asset is
 * account creation, which is already gated on a signature nobody can forge.
 *
 * The obvious key for a pre-verification budget would be the client IP, and
 * that is the reason not to: behind the reverse proxy it comes from
 * `x-forwarded-for`, which a flooder sets freely - the limit would be evaded
 * by the attacker and land on whichever volunteer's address they chose to
 * spoof. Keying on email isn't available either; the token has to be verified
 * before we know it.
 */

const googleSchema = z.object({
  // ID tokens sit comfortably under 2 KB; the cap just stops an unbounded body
  // reaching the verifier.
  idToken: z
    .string()
    .min(1, "Missing Google sign-in token")
    .max(4096, "Missing Google sign-in token"),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = googleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const verified = await verifyGoogleIdToken(parsed.data.idToken);

  if (!verified.ok) {
    if (verified.reason === "not-configured") {
      return NextResponse.json(
        {
          error:
            "Google sign-in isn't set up on this server. Please sign in with your email and password.",
          code: "GOOGLE_NOT_CONFIGURED",
        },
        { status: 503 }
      );
    }
    if (verified.reason === "email-unverified") {
      return NextResponse.json(
        {
          error:
            "That Google account's email address hasn't been verified with Google yet.",
          code: "EMAIL_NOT_VERIFIED",
        },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { error: "We couldn't verify that Google sign-in. Please try again." },
      { status: 401 }
    );
  }

  const result = await signInWithGoogleIdentity(verified.identity);

  if (!result.ok) {
    if (result.reason === "not-linked") {
      return NextResponse.json(
        {
          error:
            "There's already an account with this email address. Sign in with your email and password instead.",
          code: "ACCOUNT_NOT_LINKED",
        },
        { status: 409 }
      );
    }
    return NextResponse.json(
      {
        error:
          "This account is no longer active. Please get in touch with the team if that's a surprise.",
        code: "ACCOUNT_ARCHIVED",
      },
      { status: 403 }
    );
  }

  const token = await issueApiToken(result.user.id);
  return NextResponse.json(
    { token, user: serializeSessionUser(result.user) },
    { status: result.created ? 201 : 200 }
  );
}
