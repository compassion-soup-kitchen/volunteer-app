import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiAuth } from "@/lib/api/auth";
import { getDb } from "@/lib/db";

const registerSchema = z.object({
  token: z
    .string()
    .regex(/^ExponentPushToken\[.+\]$/, "Not a valid Expo push token."),
  platform: z.enum(["ios", "android"]),
});

/**
 * Registers the device's Expo push token for the signed-in user. A token
 * identifies a device, not a person — if someone else signs in on the same
 * device, the token moves to them.
 */
export const POST = withApiAuth(async (req, user) => {
  const body = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { token, platform } = parsed.data;
  const db = getDb();

  await db.pushToken.upsert({
    where: { token },
    create: { token, platform, userId: user.id },
    update: { platform, userId: user.id },
  });

  return NextResponse.json({ success: true });
});

const unregisterSchema = z.object({
  token: z.string().min(1),
});

/** Removes the device's push token, e.g. on sign-out. */
export const DELETE = withApiAuth(async (req, user) => {
  const body = await req.json().catch(() => null);
  const parsed = unregisterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const db = getDb();
  await db.pushToken.deleteMany({
    where: { token: parsed.data.token, userId: user.id },
  });

  return NextResponse.json({ success: true });
});
