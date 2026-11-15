"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { NIGERIAN_STATES } from "@/lib/nigeria";

type SellerOption = { id: string; displayName: string; email: string | null; phone: string | null; businessName: string | null };

const CATEGORIES = ["Property", "Cars", "Home & Living", "Marketplace", "General Merchandise"];

export function NewListingForm({ sellers }: { sellers: SellerOption[] }) {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const uploadedIds: string[] = [];
    try {
      if (files.length < 1 || files.length > 10) throw new Error("Choose between one and ten images.");
      for (const file of files) {
        const uploadData = new FormData();
        uploadData.append("file", file);
        const uploadResponse = await fetch("/api/upload", { method: "POST", body: uploadData });
        const uploadJson = await uploadResponse.json();
        if (!uploadResponse.ok || !uploadJson.mediaId) throw new Error(uploadJson.error || "An image could not be uploaded.");
        uploadedIds.push(uploadJson.mediaId);
      }

      const payload: Record<string, string | string[]> = {};
      form.forEach((value, key) => { payload[key] = String(value); });
      payload.mediaIds = uploadedIds;
      const response = await fetch("/api/admin/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "The listing could not be created.");
      router.push("/admin/listings");
      router.refresh();
    } catch (caught) {
      await Promise.all(uploadedIds.map((id) => fetch(`/api/upload/${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => undefined)));
      setError(caught instanceof Error ? caught.message : "The listing could not be created.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {error && <p role="alert" className="rounded-control border border-danger-700/30 bg-danger-700/5 p-3 text-sm text-danger-700">{error}</p>}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-ink-900">Seller account</h2>
        <label className="block text-sm font-medium text-ink-800" htmlFor="sellerUserId">Select an existing ENES user</label>
        <select id="sellerUserId" name="sellerUserId" required defaultValue="" className="w-full rounded-control border border-line-200 bg-white px-3 py-3 text-sm">
          <option value="" disabled>Select seller</option>
          {sellers.map((seller) => <option key={seller.id} value={seller.id}>{seller.businessName || seller.displayName}{seller.phone ? ` — ${seller.phone}` : ""}</option>)}
        </select>
        {sellers.length === 0 && <p className="text-sm text-muted-600">No eligible seller accounts are available. A user must register and have a valid public contact number first.</p>}
      </section>

      <section className="space-y-4">
        <h2 className="text-base font-semibold text-ink-900">Listing details</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-medium text-ink-800">Title<input name="title" required maxLength={120} className="mt-1 w-full rounded-control border border-line-200 px-3 py-3 font-normal" /></label>
          <label className="block text-sm font-medium text-ink-800">Category<select name="category" required defaultValue="" className="mt-1 w-full rounded-control border border-line-200 bg-white px-3 py-3 font-normal"><option value="" disabled>Select category</option>{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
          <label className="block text-sm font-medium text-ink-800">Price (₦)<input name="price" required type="number" min="1" max="1000000000000" step="1" className="mt-1 w-full rounded-control border border-line-200 px-3 py-3 font-normal" /></label>
          <label className="block text-sm font-medium text-ink-800">Price period<input name="pricePeriod" maxLength={40} placeholder="e.g. per year" className="mt-1 w-full rounded-control border border-line-200 px-3 py-3 font-normal" /></label>
          <label className="block text-sm font-medium text-ink-800 md:col-span-2">Description<textarea name="description" required minLength={12} maxLength={12000} rows={5} className="mt-1 w-full rounded-control border border-line-200 px-3 py-3 font-normal" /></label>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-base font-semibold text-ink-900">Location</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="block text-sm font-medium text-ink-800">State<select name="state" required defaultValue="" className="mt-1 w-full rounded-control border border-line-200 bg-white px-3 py-3 font-normal"><option value="" disabled>Select state</option>{NIGERIAN_STATES.map((state) => <option key={state}>{state}</option>)}</select></label>
          <label className="block text-sm font-medium text-ink-800">City / town<input name="city" required maxLength={100} className="mt-1 w-full rounded-control border border-line-200 px-3 py-3 font-normal" /></label>
          <label className="block text-sm font-medium text-ink-800">Area<input name="area" maxLength={120} className="mt-1 w-full rounded-control border border-line-200 px-3 py-3 font-normal" /></label>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-base font-semibold text-ink-900">Category details</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="block text-sm font-medium text-ink-800">Property intent / listing type<input name="intent" maxLength={40} placeholder="sale, rent, lease" className="mt-1 w-full rounded-control border border-line-200 px-3 py-3 font-normal" /></label>
          <label className="block text-sm font-medium text-ink-800">Property type<input name="propertyType" maxLength={80} placeholder="house, apartment, land" className="mt-1 w-full rounded-control border border-line-200 px-3 py-3 font-normal" /></label>
          <label className="block text-sm font-medium text-ink-800">Condition<input name="condition" maxLength={60} placeholder="new, used" className="mt-1 w-full rounded-control border border-line-200 px-3 py-3 font-normal" /></label>
          <label className="block text-sm font-medium text-ink-800">Bedrooms<input name="bedrooms" type="number" min="0" max="100" className="mt-1 w-full rounded-control border border-line-200 px-3 py-3 font-normal" /></label>
          <label className="block text-sm font-medium text-ink-800">Bathrooms<input name="bathrooms" type="number" min="0" max="100" step="0.5" className="mt-1 w-full rounded-control border border-line-200 px-3 py-3 font-normal" /></label>
          <label className="block text-sm font-medium text-ink-800">Land size<input name="landSize" maxLength={80} className="mt-1 w-full rounded-control border border-line-200 px-3 py-3 font-normal" /></label>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-ink-900">Listing photos</h2>
        <p className="text-sm text-muted-600">Images are uploaded to the private review bucket. They are not public until separately approved.</p>
        <input type="file" accept="image/jpeg,image/png,image/webp" multiple required onChange={(event) => {
          const selected = Array.from(event.target.files || []);
          if (selected.length > 10) {
            setError("Choose no more than ten images.");
            event.target.value = "";
            setFiles([]);
            return;
          }
          setError("");
          setFiles(selected);
        }} className="block w-full text-sm text-ink-700 file:mr-4 file:rounded-control file:border-0 file:bg-ink-900 file:px-4 file:py-3 file:font-semibold file:text-white" />
        {previews.length > 0 && <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">{previews.map((url, index) => <img key={`${url}-${index}`} src={url} alt={`Selected listing photo ${index + 1}`} className="aspect-square w-full rounded-control border border-line-200 object-cover" />)}</div>}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-200 pt-5">
        <p className="max-w-lg text-xs text-muted-600">This creates a pending submission for the selected seller. It does not publish the listing or verify the seller, property or title.</p>
        <Button type="submit" disabled={loading || sellers.length === 0}>{loading ? "Saving listing…" : "Submit for review"}</Button>
      </div>
    </form>
  );
}
