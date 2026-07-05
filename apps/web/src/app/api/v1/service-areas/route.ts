import { NextResponse } from "next/server";
import { withApiAuth } from "@/lib/api/auth";
import { listServiceAreas } from "@/lib/data/volunteer-profile";

export const GET = withApiAuth(async () => {
  const areas = await listServiceAreas();
  return NextResponse.json(
    areas.map((area) => ({
      id: area.id,
      name: area.name,
      description: area.description,
    }))
  );
});
