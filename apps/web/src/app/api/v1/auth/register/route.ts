import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { issueApiToken } from "@/lib/api/token";
import { serializeSessionUser } from "@/lib/api/serializers";
import { createUserAccount } from "@/lib/data/users";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const created = await createUserAccount(
    parsed.data.name,
    parsed.data.email,
    parsed.data.password
  );

  if (created.error || !created.user) {
    return NextResponse.json(
      { error: created.error ?? "Something went wrong. Please try again." },
      { status: 409 }
    );
  }

  const token = await issueApiToken(created.user.id);
  return NextResponse.json(
    { token, user: serializeSessionUser(created.user) },
    { status: 201 }
  );
}
