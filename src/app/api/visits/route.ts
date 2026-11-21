import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|headless|lighthouse|monitor|uptime|pingdom/i;
const done = () => new NextResponse(null, { status: 204 });

function countryFrom(request: NextRequest): string | null {
  const direct = request.headers.get("cf-ipcountry") || request.headers.get("x-vercel-ip-country") || request.headers.get("x-country");
  if (direct && /^[A-Za-z]{2}$/.test(direct)) return direct.toUpperCase();
  const netlify = request.headers.get("x-nf-geo");
  if (netlify) {
    try {
      const code = JSON.parse(Buffer.from(netlify, "base64").toString("utf8"))?.country?.code;
      if (typeof code === "string" && /^[A-Za-z]{2}$/.test(code)) return code.toUpperCase();
    } catch { /* header not in the expected format */ }
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const agent = request.headers.get("user-agent") || "";
    if (!agent || BOT.test(agent)) return done();
    const body = await request.json().catch(() => null);
    const key = typeof body?.key === "string" && /^[A-Za-z0-9-]{8,64}$/.test(body.key) ? body.key : null;
    const path = typeof body?.path === "string" && body.path.startsWith("/") && body.path.length <= 200 ? body.path.split("?")[0] : null;
    if (!key || !path) return done();

    const recent = await prisma.siteVisit.findFirst({ where: { visitorKey: key, path, createdAt: { gte: new Date(Date.now() - 60_000) } }, select: { id: true } });
    if (recent) return done();
    const lastHour = await prisma.siteVisit.count({ where: { visitorKey: key, createdAt: { gte: new Date(Date.now() - 3_600_000) } } });
    if (lastHour >= 300) return done();
    const known = await prisma.siteVisit.findFirst({ where: { visitorKey: key }, select: { id: true } });

    await prisma.siteVisit.create({
      data: {
        visitorKey: key,
        path,
        referrer: typeof body.referrer === "string" && body.referrer ? body.referrer.slice(0, 120) : null,
        country: countryFrom(request),
        device: /Mobi|Android|iPhone|iPad/i.test(agent) ? "mobile" : "desktop",
        isNewVisitor: !known,
      },
    });
    if (Math.random() < 0.01) await prisma.siteVisit.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 30 * 86_400_000) } } });
    return done();
  } catch (error) {
    console.error("Visit log failed", error instanceof Error ? error.name : "UnknownError");
    return done();
  }
}
