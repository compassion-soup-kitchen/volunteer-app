import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { issueApiToken } from "@/lib/api/token";
import { serializeSessionUser } from "@/lib/api/serializers";
import { verifyCredentials } from "@/lib/data/users";

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
