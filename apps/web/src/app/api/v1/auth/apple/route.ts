import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { issueApiToken } from "@/lib/api/token";
import { serializeSessionUser } from "@/lib/api/serializers";
import { signInWithAppleIdentity } from "@/lib/data/apple-accounts";
import { verifyAppleIdToken } from "@/lib/apple-id-token";
import { exchangeAppleAuthorizationCode } from "@/lib/apple-api";

/**
 * Sign in with Apple for the mobile app.
 *
 * The native app completes Apple's flow on-device and posts the resulting
 * identity token here; we verify it against Apple's keys, map it to an
 * account, and hand back the same bearer token `/api/v1/auth/login` issues.
 *
 * The sibling of `/api/v1/auth/google`, and unrated for the same reasons set
 * out there: verifying a signature is four orders of magnitude cheaper than a
 * bcrypt comparison, account creation is already gated on a signature nobody
 * can forge, and the only pre-verification key available - the client IP -
 * comes from `x-forwarded-for` behind the proxy, so a limit on it would be
 * evaded by a flooder and land on whichever volunteer's address they spoofed.
 *
 * Two fields beyond the token, both optional, both because of how Apple works:
 * `fullName` is the name Apple gives the client on the first authorisation and
 * never again, and `authorizationCode` is exchanged for the refresh token that
 * makes revocation-on-deletion possible. Neither is trusted for identity - the
 * verified token's `sub` is the only thing an account is keyed on.
 */

const appleSchema = z.object({
  // Identity tokens sit comfortably under 2 KB; the cap just stops an
  // unbounded body reaching the verifier.
  identityToken: z
    .string()
    .min(1, "Missing Apple sign-in token")
    .max(4096, "Missing Apple sign-in token"),
  authorizationCode: z.string().max(1024).optional(),
  fullName: z.string().max(200).optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = appleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const verified = await verifyAppleIdToken(parsed.data.identityToken);

  if (!verified.ok) {
    if (verified.reason === "not-configured") {
      return NextResponse.json(
        {
          error:
            "Apple sign-in isn't set up on this server. Please sign in with your email and password.",
          code: "APPLE_NOT_CONFIGURED",
        },
        { status: 503 }
      );
    }
    if (verified.reason === "email-unverified") {
      return NextResponse.json(
        {
          error:
            "That Apple account's email address hasn't been verified with Apple yet.",
          code: "EMAIL_NOT_VERIFIED",
        },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { error: "We couldn't verify that Apple sign-in. Please try again." },
      { status: 401 }
    );
  }

  // Only worth the round trip when Apple actually issued a code. A failure
  // here returns null and sign-in continues - see `apple-api`.
  const refreshToken = parsed.data.authorizationCode
    ? await exchangeAppleAuthorizationCode(parsed.data.authorizationCode)
    : null;

  const result = await signInWithAppleIdentity({
    identity: verified.identity,
    fullName: parsed.data.fullName,
    refreshToken,
  });

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
    if (result.reason === "no-email") {
      // Apple is treating this as a repeat authorisation, so it withheld the
      // address, but we have no account to match the `sub` to. Almost always a
      // deleted account whose token we failed to revoke; the way out is for
      // the person to remove the app under Apple ID → Sign in with Apple,
      // which makes the next attempt a first authorisation again.
      return NextResponse.json(
        {
          error:
            "Apple didn't share your email address, so we can't set up an account. In Settings › your name › Sign in with Apple, remove Compassion, then try again — or sign up with your email address.",
          code: "APPLE_NO_EMAIL",
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
