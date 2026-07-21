import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    await getDb().$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", db: "ok" });
  } catch (error) {
    // Log the real cause server-side; the response body stays generic because
    // this endpoint is unauthenticated.
    console.error("Readiness check failed:", error);
    return NextResponse.json(
      { status: "error", db: "error" },
      { status: 503 },
    );
  }
}
