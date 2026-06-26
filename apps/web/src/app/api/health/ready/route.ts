import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    await getDb().$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", db: "ok" });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        db: "error",
        error: error instanceof Error ? error.message : "unknown",
      },
      { status: 503 },
    );
  }
}
