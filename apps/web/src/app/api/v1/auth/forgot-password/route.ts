import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  RESET_NEUTRAL_MESSAGE,
  sendPasswordResetLink,
} from "@/lib/data/password-reset";

const forgotPasswordSchema = z.object({
  email: z.email("Please enter a valid email address"),
});

/**
 * Emails a password reset link - the app's "Forgot password?". The link opens
 * the web `/reset-password` page, after which the volunteer signs in to the
 * app with the new password. Answers with the same neutral message whether or
 * not the address has an account (and shares the `password-reset:` budget
 * with the web form), so it can't be used to probe who is registered.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  await sendPasswordResetLink(parsed.data.email);

  return NextResponse.json({ message: RESET_NEUTRAL_MESSAGE });
}
