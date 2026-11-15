import { NextResponse } from "next/server";
import { getPublishedSiteContent } from "@/lib/site-content";

export const dynamic = "force-dynamic";

export async function GET() {
  const content = await getPublishedSiteContent();
  return NextResponse.json(
    { mobileNav: content.mobileNav },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
}
