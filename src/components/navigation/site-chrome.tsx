"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark, Home, ListPlus, MessageSquare, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

const items = [
  { href: "/", labelKey: "homeLabel", fallback: "Home", Icon: Home, kind: "regular" },
  { href: "/saved", labelKey: "savedLabel", fallback: "Saved", Icon: Bookmark, kind: "regular" },
  { href: "/post", labelKey: "listLabel", fallback: "List", Icon: ListPlus, kind: "primary" },
  { href: "/messages", labelKey: "messagesLabel", fallback: "Messages", Icon: MessageSquare, kind: "regular" },
  { href: "/dashboard", labelKey: "profileLabel", fallback: "Profile", Icon: UserRound, kind: "regular" },
] as const;

type MobileLabels = Partial<Record<(typeof items)[number]["labelKey"], string>>;

function useMobileLabels(): MobileLabels {
  const [labels, setLabels] = useState<MobileLabels>({});
  useEffect(() => {
    let active = true;
    fetch("/api/site-content/navigation", { cache: "no-store" })
      .then((response) => response.ok ? response.json() as Promise<{ mobileNav?: MobileLabels }> : null)
      .then((data) => { if (active && data?.mobileNav) setLabels(data.mobileNav); })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);
  return labels;
}

function MobileBottomNav({ labels }: { labels: MobileLabels }) {
  const pathname = usePathname();
  const activePath = (href: string) => href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav aria-label="Primary mobile navigation" className="fixed inset-x-0 bottom-0 z-[80] border-t border-[#E5E0D6] bg-[#FFFDF8]/96 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(24,33,31,.07)] backdrop-blur-xl sm:hidden">
      <div className="mx-auto grid min-h-[62px] max-w-lg grid-cols-5 items-center px-1">
        {items.map(({ href, fallback, labelKey, Icon, kind }) => {
          const active = activePath(href);
          const label = labels[labelKey]?.trim() || fallback;
          if (kind === "primary") {
            return (
              <Link key={href} href={href} aria-label={label} aria-current={active ? "page" : undefined} className="flex min-h-[60px] flex-col items-center justify-center gap-1 text-[9px] font-extrabold text-[#18211F]">
                <span className="flex h-9 w-10 items-center justify-center rounded-[13px] bg-[#C96745] text-white shadow-[0_5px_12px_rgba(201,103,69,.22)]"><Icon className="h-[18px] w-[18px]" /></span>
                <span>{label}</span>
              </Link>
            );
          }
          return (
            <Link key={href} href={href} aria-label={label} aria-current={active ? "page" : undefined} className={`flex min-h-[60px] flex-col items-center justify-center gap-1 text-[9px] font-extrabold transition ${active ? "text-[#176B57]" : "text-[#77827B] hover:text-[#18211F]"}`}>
              <Icon className={`h-[18px] w-[18px] ${active ? "stroke-[2.5]" : ""}`} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const labels = useMobileLabels();
  const hideNavigation = pathname.startsWith("/admin") || pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up");
  return (
    <div className={hideNavigation ? "min-h-screen" : "min-h-screen pb-[calc(4.25rem+env(safe-area-inset-bottom))] sm:pb-0"}>
      {children}
      {!hideNavigation && <MobileBottomNav labels={labels} />}
    </div>
  );
}
