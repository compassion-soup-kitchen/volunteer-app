import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { issueApiToken } from "@/lib/api/token";
import { serializeSessionUser } from "@/lib/api/serializers";
import { normalizeEmail, verifyCredentials } from "@/lib/data/users";
import { authRateLimits, checkRateLimit } from "@/lib/rate-limit";

const loginSchema = z.object({
  email: z.email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  // Shares the `login:` budget with the web sign-in form.
  const throttle = checkRateLimit(
    `login:${normalizeEmail(parsed.data.email)}`,
    authRateLimits.login
  );
  if (!throttle.allowed) {
    return NextResponse.json(
      {
        error:
          "Too many sign-in attempts just now. Take a breather and try again in a few minutes.",
      },
      {
        status: 429,
        headers: { "Retry-After": String(throttle.retryAfterSeconds) },
      }
    );
  }

  const user = await verifyCredentials(parsed.data.email, parsed.data.password);
  if (!user) {
    return NextResponse.json(
      { error: "Invalid email or password" },
      { status: 401 }
    );
  }

  const token = await issueApiToken(user.id);
  return NextResponse.json({ token, user: serializeSessionUser(user) });
}
