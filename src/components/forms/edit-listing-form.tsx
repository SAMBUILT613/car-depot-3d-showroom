"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Star, Trash2, UploadCloud } from "lucide-react";
import { NIGERIAN_STATES } from "@/lib/nigeria";

export type EditableListing = Record<string, string | number | boolean | null> & {
  id: string; category: string; status: string; deliveryAvailable: boolean;
};
export type EditablePhoto = { id: string; url: string | null; pending: boolean };
type Photo = EditablePhoto & { isNew?: boolean };
type Option = string | [string, string];
type Field = { name: string; label: string; type?: "text" | "number" | "select"; options?: Option[]; step?: string; max?: number; placeholder?: string };

const INTENTS: Option[] = [["FOR_SALE", "For sale"], ["FOR_RENT", "For rent"], ["LAND_FOR_SALE", "Land for sale"], ["COMMERCIAL_FOR_RENT", "Commercial rent"], ["COMMERCIAL_FOR_SALE", "Commercial sale"], ["SHORT_LET", "Short let"]];
const FIELDS: Record<string, Field[]> = {
  Property: [
    { name: "intent", label: "Listing purpose", type: "select", options: INTENTS },
    { name: "propertyType", label: "Property type", type: "select", options: ["House", "Apartment", "Flat", "Duplex", "Bungalow", "Land", "Commercial", "Warehouse", "Office", "Shop", "Other"] },
    { name: "bedrooms", label: "Bedrooms", type: "number", max: 100 },
    { name: "bathrooms", label: "Bathrooms", type: "number", max: 100, step: "0.5" },
    { name: "landSize", label: "Land size", placeholder: "e.g. 500 sqm" },
    { name: "furnishing", label: "Furnishing", type: "select", options: ["Furnished", "Unfurnished", "Partly furnished"] },
    { name: "parkingSpaces", label: "Parking spaces", type: "number", max: 1000 },
  ],
  Cars: [
    { name: "make", label: "Make", placeholder: "e.g. Toyota" },
    { name: "model", label: "Model", placeholder: "e.g. Corolla" },
    { name: "vehicleYear", label: "Year", type: "number" },
    { name: "mileage", label: "Mileage (km)", type: "number" },
    { name: "condition", label: "Condition", type: "select", options: ["New", "Foreign Used", "Nigerian Used"] },
    { name: "transmission", label: "Transmission", type: "select", options: ["Automatic", "Manual", "CVT"] },
    { name: "fuelType", label: "Fuel type", type: "select", options: ["Petrol", "Diesel", "Hybrid", "Electric", "Other"] },
  ],
  Items: [
    { name: "condition", label: "Condition", type: "select", options: ["New", "Used", "Refurbished"] },
    { name: "itemBrand", label: "Brand (optional)" },
    { name: "itemDimensions", label: "Dimensions or size" },
    { name: "quantity", label: "Quantity", type: "number", max: 100000 },
  ],
};
const CATEGORY_OPTIONS: Option[] = [["Property", "Property"], ["Cars", "Cars & vehicles"], ["Home & Living", "Home & Living"], ["Marketplace", "General goods"]];
const TEXT_KEYS = ["title", "description", "price", "pricePeriod", "category", "subCategory", "condition", "intent", "propertyType", "bedrooms", "bathrooms", "landSize", "furnishing", "parkingSpaces", "make", "model", "vehicleYear", "mileage", "transmission", "fuelType", "itemBrand", "itemDimensions", "quantity", "state", "city", "area", "sellerName", "sellerPhone", "sellerEmail"];

export function EditListingForm({ listing, photos: initialPhotos, mode, endpoint, backHref, viewHref }: {
  listing: EditableListing; photos: EditablePhoto[]; mode: "seller" | "admin"; endpoint: string; backHref: string; viewHref: string;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(TEXT_KEYS.map((key) => [key, listing[key] === null || listing[key] === undefined ? "" : String(listing[key])])));
  const [delivery, setDelivery] = useState(Boolean(listing.deliveryAvailable));
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const category = values.category;
  const fields = FIELDS[category === "Property" ? "Property" : category === "Cars" ? "Cars" : "Items"];
  const isLive = listing.status === "PUBLISHED";
  const set = (name: string, value: string) => setValues((current) => ({ ...current, [name]: value }));

  function input(field: Field) {
    const common = { value: values[field.name] ?? "", onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => set(field.name, event.target.value), className: "enes-field" };
    if (field.type === "select") {
      return (
        <select {...common}>
          <option value="">Not specified</option>
          {(field.options ?? []).map((option) => Array.isArray(option) ? <option key={option[0]} value={option[0]}>{option[1]}</option> : <option key={option} value={option}>{option}</option>)}
        </select>
      );
    }
    return <input {...common} type={field.type === "number" ? "number" : "text"} min={field.type === "number" ? 0 : undefined} max={field.max} step={field.step} placeholder={field.placeholder} />;
  }

  async function onFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;
    if (photos.length + files.length > 10) { setError("A listing can have up to 10 photos."); return; }
    setUploading(true); setError(""); setNotice("");
    const added: Photo[] = [];
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch("/api/upload", { method: "POST", body: formData });
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.mediaId) throw new Error(payload?.error || "Could not upload " + file.name);
        added.push({ id: payload.mediaId, url: URL.createObjectURL(file), pending: false, isNew: true });
      }
      setPhotos((current) => [...current, ...added]);
    } catch (cause) {
      await Promise.all(added.map((photo) => fetch("/api/upload/" + encodeURIComponent(photo.id), { method: "DELETE" }).catch(() => undefined)));
      setError(cause instanceof Error ? cause.message : "Photo upload failed.");
    } finally { setUploading(false); }
  }

  async function removePhoto(photo: Photo) {
    setPhotos((current) => current.filter((item) => item.id !== photo.id));
    if (photo.isNew) await fetch("/api/upload/" + encodeURIComponent(photo.id), { method: "DELETE" }).catch(() => undefined);
  }
  function move(index: number, to: number) {
    setPhotos((current) => {
      if (to < 0 || to >= current.length) return current;
      const copy = [...current];
      const [item] = copy.splice(index, 1);
      copy.splice(to, 0, item);
      return copy;
    });
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || uploading) return;
    setSaving(true); setError(""); setNotice("");
    try {
      const payload: Record<string, unknown> = { ...values, deliveryAvailable: delivery, mediaOrder: photos.map((photo) => photo.id) };
      if (mode === "seller") { delete payload.sellerName; delete payload.sellerEmail; delete payload.category; }
      const response = await fetch(endpoint, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.ok) throw new Error(result?.error || "Your changes could not be saved.");
      setPhotos((current) => current.map((photo) => ({ ...photo, isNew: false })));
      setNotice(result.changed?.length ? (isLive ? "Saved. Your changes are live now." : "Saved.") : "Nothing was changed.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Your changes could not be saved.");
    } finally { setSaving(false); }
  }

  return (
    <form noValidate onSubmit={onSubmit} className="rounded-[17px] border border-[#D5E5DC] bg-white p-5 sm:p-8">
      {isLive && <p className="mb-5 rounded-[9px] bg-[#DDF1E6] p-3 text-[12px] font-semibold text-[#004D15]">This listing is live. Changes you save appear on the site immediately, and ENES keeps a record of every change.</p>}

      <p className="text-[13px] font-extrabold text-[#04180C]">Photos <span className="font-semibold text-[#5B6761]">({photos.length}/10)</span></p>
      <p className="mt-1 text-[11px] text-[#5B6761]">The first photo is the cover. Use the arrows to reorder.{isLive || mode === "admin" ? " New photos go live when you save." : " New photos are checked by ENES before they show."}</p>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {photos.map((photo, index) => (
          <div key={photo.id} className="overflow-hidden rounded-[12px] border border-[#D5E5DC] bg-[#EAF6F1]">
            <div className="relative aspect-[4/3]">
              {photo.url ? <img src={photo.url} alt={"Photo " + (index + 1)} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center p-2 text-center text-[10px] font-bold text-[#5B6761]">Awaiting ENES review</div>}
              {index === 0 && <span className="absolute left-2 top-2 rounded-full bg-[#006B1D] px-2 py-0.5 text-[9px] font-extrabold text-white">Cover</span>}
            </div>
            <div className="flex items-center justify-between gap-1 p-1.5">
              <button type="button" onClick={() => move(index, index - 1)} disabled={index === 0} aria-label="Move earlier" className="flex h-8 w-8 items-center justify-center rounded-md text-[#04180C] disabled:opacity-30"><ArrowLeft className="h-4 w-4" /></button>
              {index > 0 && <button type="button" onClick={() => move(index, 0)} aria-label="Make cover photo" className="flex h-8 w-8 items-center justify-center rounded-md text-[#006B1D]"><Star className="h-4 w-4" /></button>}
              <button type="button" onClick={() => move(index, index + 1)} disabled={index === photos.length - 1} aria-label="Move later" className="flex h-8 w-8 items-center justify-center rounded-md text-[#04180C] disabled:opacity-30"><ArrowRight className="h-4 w-4" /></button>
              <button type="button" onClick={() => removePhoto(photo)} aria-label="Remove photo" className="flex h-8 w-8 items-center justify-center rounded-md text-[#A10D10]"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
        {photos.length < 10 && (
          <label className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-1 rounded-[12px] border border-dashed border-[#006B1D] bg-[#EAF6F1] text-[11px] font-bold text-[#006B1D]">
            <UploadCloud className="h-6 w-6" />{uploading ? "Uploading…" : "Add photos"}
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={onFiles} disabled={uploading} />
          </label>
        )}
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-2">
        <label className="sm:col-span-2"><span className="enes-label">Listing title</span><input maxLength={120} value={values.title} onChange={(event) => set("title", event.target.value)} className="enes-field" /></label>
        <label><span className="enes-label">Category</span>
          {mode === "admin"
            ? <select value={values.category} onChange={(event) => set("category", event.target.value)} className="enes-field">{CATEGORY_OPTIONS.map((option) => <option key={String(option[0])} value={String(option[0])}>{String(option[1])}</option>)}</select>
            : <input value={values.category} readOnly className="enes-field bg-[#EAF6F1]" />}
        </label>
        <label><span className="enes-label">Subcategory</span><input maxLength={100} value={values.subCategory} onChange={(event) => set("subCategory", event.target.value)} className="enes-field" /></label>
      </div>

      <div className="mt-5 rounded-[12px] bg-[#EAF6F1] p-4">
        <p className="text-[11px] font-extrabold text-[#04180C]">{category === "Property" ? "Property details" : category === "Cars" ? "Vehicle details" : "Item details"}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {fields.map((field) => <label key={field.name}><span className="enes-label">{field.label}</span>{input(field)}</label>)}
          {category !== "Property" && category !== "Cars" && (
            <label className="flex min-h-12 items-center gap-2 sm:col-span-2"><input type="checkbox" checked={delivery} onChange={(event) => setDelivery(event.target.checked)} className="h-4 w-4 accent-[#006B1D]" /><span className="text-[11px] font-bold text-[#25402F]">Delivery available</span></label>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <label><span className="enes-label">Price (₦)</span><input type="number" min={0} max={2000000000} step={1} value={values.price} onChange={(event) => set("price", event.target.value)} className="enes-field" /></label>
        <label><span className="enes-label">Price period (if applicable)</span>
          <select value={values.pricePeriod} onChange={(event) => set("pricePeriod", event.target.value)} className="enes-field">
            <option value="">One-time / not specified</option><option value="per annum">Per annum</option><option value="per month">Per month</option><option value="per week">Per week</option><option value="per day">Per day</option>
          </select>
        </label>
      </div>
      <label className="mt-4 block"><span className="enes-label">Description</span><textarea rows={7} maxLength={12000} value={values.description} onChange={(event) => set("description", event.target.value)} className="enes-field !h-auto" /></label>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <label><span className="enes-label">State</span><select value={values.state} onChange={(event) => set("state", event.target.value)} className="enes-field"><option value="">Select state</option>{NIGERIAN_STATES.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label><span className="enes-label">City or town</span><input maxLength={100} value={values.city} onChange={(event) => set("city", event.target.value)} className="enes-field" /></label>
        <label><span className="enes-label">Area (optional)</span><input maxLength={120} value={values.area} onChange={(event) => set("area", event.target.value)} className="enes-field" /></label>
      </div>

      <div className="mt-5 rounded-[12px] bg-[#EAF6F1] p-4">
        <p className="text-[11px] font-extrabold text-[#04180C]">{mode === "admin" ? "Seller details shown on the listing" : "Private contact (only ENES sees this)"}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {mode === "admin" && <label><span className="enes-label">Seller name</span><input maxLength={120} value={values.sellerName} onChange={(event) => set("sellerName", event.target.value)} className="enes-field" /></label>}
          <label><span className="enes-label">WhatsApp / phone number</span><input maxLength={30} value={values.sellerPhone} onChange={(event) => set("sellerPhone", event.target.value)} className="enes-field" placeholder="e.g. 08012345678" /></label>
          {mode === "admin" && <label><span className="enes-label">Seller email (optional)</span><input maxLength={254} value={values.sellerEmail} onChange={(event) => set("sellerEmail", event.target.value)} className="enes-field" /></label>}
        </div>
      </div>

      {error && <div role="alert" className="mt-6 rounded-[9px] bg-[#FBE9E9] p-3 text-[12px] font-semibold text-[#A10D10]">{error}</div>}
      {notice && <div role="status" className="mt-6 rounded-[9px] bg-[#DDF1E6] p-3 text-[12px] font-semibold text-[#004D15]">{notice} <Link href={viewHref} className="underline">View listing</Link></div>}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <Link href={backHref} className="text-[12px] font-extrabold text-[#5B6761]">← Back</Link>
        <button type="submit" disabled={saving || uploading} className="enes-button disabled:opacity-60">{saving ? "Saving…" : "Save changes"}</button>
      </div>
    </form>
  );
}
