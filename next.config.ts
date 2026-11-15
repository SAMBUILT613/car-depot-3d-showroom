import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const privateNoStore = [
  { key: "Cache-Control", value: "private, no-store, max-age=0, must-revalidate" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/api/:path*", headers: privateNoStore },
      { source: "/admin/:path*", headers: privateNoStore },
      { source: "/dashboard/:path*", headers: privateNoStore },
      { source: "/saved", headers: privateNoStore },
      { source: "/saved/:path*", headers: privateNoStore },
      { source: "/messages", headers: privateNoStore },
      { source: "/messages/:path*", headers: privateNoStore },
      { source: "/robots.txt", headers: [{ key: "Cache-Control", value: "public, max-age=3600" }] },
      { source: "/sitemap.xml", headers: [{ key: "Cache-Control", value: "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400" }] },
    ];
  },
};

export default nextConfig;
