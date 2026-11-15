import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Quick database ping
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      database: "connected"
    });
  } catch (error) {
    return NextResponse.json({
      status: "unhealthy",
      error: "Database connection failed",
      timestamp: new Date().toISOString()
    }, { status: 503 });
  }
}
