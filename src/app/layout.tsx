import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import Script from "next/script";
import { ClerkProvider } from "@clerk/nextjs";
import { getPublishedSiteContent } from "@/lib/site-content";
import { SiteChrome } from "@/components/navigation/site-chrome";
import { SiteVisitTracker } from "@/components/analytics/site-visit-tracker";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin"], display: "swap", variable: "--font-manrope" });

export async function generateMetadata(): Promise<Metadata> {
  const content = await getPublishedSiteContent();
  const image = content.seo.socialImageUrl || content.brand.socialImageUrl;
  return {
    metadataBase: process.env.NEXT_PUBLIC_APP_URL ? new URL(process.env.NEXT_PUBLIC_APP_URL) : undefined,
    title: { default: content.seo.defaultTitle, template: `%s | ${content.brand.name} Properties` },
    description: content.seo.description,
    applicationName: `${content.brand.name} Properties`,
    icons: content.brand.faviconUrl ? { icon: content.brand.faviconUrl } : undefined,
    openGraph: {
      type: "website",
      siteName: `${content.brand.name} Properties`,
      title: content.seo.defaultTitle,
      description: content.seo.description,
      ...(image ? { images: [image] } : {}),
    },
    twitter: { card: image ? "summary_large_image" : "summary", ...(image ? { images: [image] } : {}) },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className={manrope.variable}>
        <body className={`${manrope.className} min-h-screen flex flex-col`}><SiteChrome>{children}</SiteChrome><SiteVisitTracker /><Script id="tawk-to" strategy="afterInteractive">{`var Tawk_API=Tawk_API||{}, Tawk_LoadStart=new Date();(function(){var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];s1.async=true;s1.src="https://embed.tawk.to/6b0181114f656f3cd9b25771/default";s1.charset="UTF-8";s1.setAttribute("crossorigin","*");s0.parentNode.insertBefore(s1,s0);})();`}</Script></body>
      </html>
    </ClerkProvider>
  );
}
