import { prisma } from "@/lib/db";
import { requireAdminPermission } from "@/lib/auth";
import { NewListingForm } from "@/components/admin/new-listing-form";

export default async function NewAdminListingPage() {
  await requireAdminPermission("listings:create_for_seller");
  await requireAdminPermission("sellers:view");
  const users = await prisma.user.findMany({
    where: { status: "ACTIVE", adminUser: null },
    orderBy: { displayName: "asc" },
    take: 250,
    select: { id: true, displayName: true, email: true, phone: true, sellerProfile: { select: { businessName: true, phone: true, whatsappNumber: true } } },
  });
  const sellers = users.map((user) => ({
    id: user.id,
    displayName: user.displayName,
    email: user.email,
    phone: user.sellerProfile?.whatsappNumber || user.sellerProfile?.phone || user.phone,
    businessName: user.sellerProfile?.businessName || null,
  }));
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 md:px-6 lg:px-8">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-coral-700">ENES administration</p>
        <h1 className="mt-2 text-2xl font-bold text-ink-900">Create a listing for a seller</h1>
        <p className="mt-2 text-sm text-muted-600">Select an existing ENES user. Seller contact details are drawn from that account, not supplied by the form.</p>
      </div>
      <div className="rounded-card border border-line-200 bg-white p-5 md:p-7">
        <NewListingForm sellers={sellers} />
      </div>
    </div>
  );
}
