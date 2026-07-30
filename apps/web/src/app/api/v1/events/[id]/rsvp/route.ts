import { NextResponse } from "next/server";
import { withApiAuth } from "@/lib/api/auth";
import { respondToEventAsUser } from "@/lib/data/events";

type Ctx = { params: Promise<{ id: string }> };

/** `{ response: "GOING" | "MAYBE" | "NOT_GOING", note?: string }` */
export const POST = withApiAuth<Ctx>(async (req, user, ctx) => {
  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Choose one of the replies." }, { status: 400 });
  }

  const { response, note } = (body ?? {}) as {
    response?: unknown;
    note?: unknown;
  };

  const result = await respondToEventAsUser(
    user.id,
    user.role,
    id,
    typeof response === "string" ? response : "",
    typeof note === "string" ? note : null
  );

  // Errors come back as a body rather than a status the app has to interpret,
  // matching the shift and training endpoints.
  return NextResponse.json(result);
});
