import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Eye, MessageCircle, List } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage() {
  await requireAdminPage("analytics:view");
  const totalViews = await prisma.analyticsEvent.count({ where: { type: "VIEW" } });
  const totalWhatsApp = await prisma.analyticsEvent.count({ where: { type: "WHATSAPP_CLICK" } });
  const publishedListings = await prisma.listing.count({ where: { status: "PUBLISHED" } });
  const pendingListings = await prisma.listing.count({ where: { status: "PENDING_REVIEW" } });

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-6 lg:px-8">
      <h1 className="text-[24px] font-bold text-ink-900 mb-6">Platform Analytics</h1>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="rounded-card border border-line-200 bg-white p-6">
          <div className="flex items-center gap-2 text-muted-600 mb-2"><Eye className="h-4 w-4" /> Total Listing Views</div>
          <div className="text-[32px] font-bold text-ink-900">{totalViews}</div>
        </div>
        <div className="rounded-card border border-line-200 bg-white p-6">
          <div className="flex items-center gap-2 text-muted-600 mb-2"><MessageCircle className="h-4 w-4" /> WhatsApp Clicks</div>
          <div className="text-[32px] font-bold text-ink-900">{totalWhatsApp}</div>
        </div>
        <div className="rounded-card border border-line-200 bg-white p-6">
          <div className="flex items-center gap-2 text-muted-600 mb-2"><List className="h-4 w-4" /> Published Listings</div>
          <div className="text-[32px] font-bold text-success-700">{publishedListings}</div>
        </div>
        <div className="rounded-card border border-line-200 bg-white p-6">
          <div className="flex items-center gap-2 text-muted-600 mb-2"><List className="h-4 w-4" /> Pending Review</div>
          <div className="text-[32px] font-bold text-warning-700">{pendingListings}</div>
        </div>
      </div>

      <div className="rounded-card border border-line-200 bg-white p-6">
        <h2 className="text-[18px] font-semibold text-ink-900 mb-2">Note on Data</h2>
        <p className="text-[14px] text-muted-600">
          All metrics are derived from real application events recorded in the Neon database. No fabricated data is displayed.
        </p>
      </div>
    </div>
  );
}
