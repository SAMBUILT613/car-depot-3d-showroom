import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isTrustedMutationOrigin } from "@/lib/security/origin";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export default clerkMiddleware(async (auth, request) => {
  const path = request.nextUrl.pathname;
  const isApiRequest = path === "/api" || path.startsWith("/api/");
  if (isApiRequest && !SAFE_METHODS.has(request.method.toUpperCase())
    && !isTrustedMutationOrigin(request)) {
    return NextResponse.json(
      { ok: false, error: "This request origin is not allowed." },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  const isAdminArea = path === "/admin" || path.startsWith("/admin/");
  const isPublicAdminEntry = path === "/admin/sign-in" || path.startsWith("/admin/sign-in/")
    || path === "/admin/accept" || path.startsWith("/admin/accept/");
  const isMemberArea = path === "/dashboard" || path.startsWith("/dashboard/")
    || path === "/saved" || path.startsWith("/saved/")
    || path === "/messages" || path.startsWith("/messages/");

  if ((isAdminArea && !isPublicAdminEntry) || isMemberArea) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Run on all pages except Next internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run on API routes
    "/(api|trpc)(.*)",
  ],
};
