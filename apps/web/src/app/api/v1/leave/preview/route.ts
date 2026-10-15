import { NextResponse } from "next/server";
import { withApiAuth } from "@/lib/api/auth";
import { serializeLeavePreview } from "@/lib/api/serializers";
import { previewLeave } from "@/lib/data/volunteer-leave";
import { readLeaveBody } from "@/lib/api/leave-body";

/**
 * `{ startsOn, endsOn, leaveId? }` - what saving would do: the shifts the
 * volunteer would come off, and anything stopping it. Changes nothing.
 */
export const POST = withApiAuth(async (req, user) => {
  const body = await readLeaveBody(req);
  if (!body) {
    return NextResponse.json({ error: "Choose the days you're away." }, { status: 400 });
  }
  const preview = await previewLeave({
    actor: { kind: "volunteer", userId: user.id },
    leaveId: body.leaveId,
    startsOn: body.startsOn,
    endsOn: body.endsOn,
  });
  // Errors come back as a body, matching the other leave endpoints.
  if ("error" in preview) return NextResponse.json(preview);
  return NextResponse.json(serializeLeavePreview(preview));
});
