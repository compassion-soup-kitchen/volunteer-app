import type { NextRequest } from "next/server";

/** The leave fields from a request body, as strings or null - zod has the final say. */
export async function readLeaveBody(req: NextRequest): Promise<{
  startsOn: string;
  endsOn: string;
  reason: string | null;
  leaveId: string | null;
} | null> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return null;
  }
  const { startsOn, endsOn, reason, leaveId } = (body ?? {}) as Record<string, unknown>;
  return {
    startsOn: typeof startsOn === "string" ? startsOn : "",
    endsOn: typeof endsOn === "string" ? endsOn : "",
    reason: typeof reason === "string" ? reason : null,
    leaveId: typeof leaveId === "string" ? leaveId : null,
  };
}
