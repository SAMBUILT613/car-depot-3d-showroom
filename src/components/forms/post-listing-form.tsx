"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { UploadCloud, X, Home, CarFront, Armchair, Store, CheckCircle2 } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { TurnstileWidget } from "@/components/shared/turnstile";
import { NIGERIAN_STATES } from "@/lib/nigeria";

type ListingCategory = "Property" | "Cars" | "Home & Living" | "Marketplace";
type UploadedMedia = { id: string; previewUrl: string; name: string };
const categories: { value: ListingCategory; label: string; description: string; Icon: typeof Home }[] = [
  { value: "Property", label: "Property", description: "Homes, land and commercial", Icon: Home },
  { value: "Cars", label: "Cars & vehicles", description: "Cars and other vehicles", Icon: CarFront },
  { value: "Home & Living", label: "Home & Living", description: "Furniture and appliances", Icon: Armchair },
  { value: "Marketplace", label: "General goods", description: "Other useful items", Icon: Store },
];

export function PostListingForm() {
  const { isLoaded, userId } = useAuth();
  const router = useRouter();
  const [category, setCategory] = useState<ListingCategory>("Property");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [uploadedMedia, setUploadedMedia] = useState<UploadedMedia[]>([]);
  const [uploading, setUploading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [step, setStep] = useState<1 | 2>(1);
  const [stepError, setStepError] = useState("");

  if (!isLoaded) return null;
  if (!userId) return <div className="flex min-h-full flex-col bg-[#EAF6F1]"><main className="flex flex-1 items-center justify-center p-6"><div className="max-w-md rounded-[18px] border border-[#D5E5DC] bg-[#FFFFFF] p-8 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#DDF1E6] text-[#006B1D]"><Store className="h-5 w-5"/></span><h1 className="mt-4 text-[22px] font-extrabold tracking-[-.04em] text-[#04180C]">Sign in to list on ENES</h1><p className="mt-2 text-[12px] leading-6 text-[#6C776F]">Listings are linked to your account so you can manage them.</p><Link href="/sign-in" className="enes-button mt-6">Sign in to continue</Link></div></main></div>;

  function continueToPhotos(event: React.MouseEvent<HTMLButtonElement>) {
    const panel = event.currentTarget.form?.querySelector('[data-step="1"]');
    const controls = panel?.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input,select,textarea");
    for (const control of Array.from(controls || [])) {
      if (!control.checkValidity()) {
        const label = control.closest("label")?.querySelector(".enes-label")?.textContent?.trim() || control.name || "A required field";
        setStepError(label + ": " + control.validationMessage);
        control.style.outline = "2px solid #A33333";
        control.addEventListener("input", () => { control.style.outline = ""; }, { once: true });
        return;
      }
    }
    setStepError("");
    setStep(2);
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;
    if (uploadedMedia.length + files.length > 10) { setError("You can attach up to 10 images to one listing."); return; }
    setUploading(true); setError(""); const added: UploadedMedia[] = [];
    try {
      for (const file of files) {
        const formData = new FormData(); formData.append("file", file);
        const response = await fetch("/api/upload", { method: "POST", body: formData });
        const payload = await response.json();
        if (!response.ok || !payload.mediaId) throw new Error(payload.error || `Could not upload ${file.name}`);
        added.push({ id: payload.mediaId, previewUrl: URL.createObjectURL(file), name: file.name });
      }
      setUploadedMedia((current) => [...current, ...added]);
    } catch (cause) {
      await Promise.all(added.map(async (media) => {
        URL.revokeObjectURL(media.previewUrl);
        try {
          await fetch(`/api/upload/${encodeURIComponent(media.id)}`, { method: "DELETE" });
        } catch {
          // The object remains private; scheduled storage cleanup can remove an orphan if needed.
        }
      }));
      setError(cause instanceof Error ? cause.message : "Image upload failed.");
    } finally { setUploading(false); }
  }

  async function removeUploadedMedia(media: UploadedMedia) {
    const response = await fetch(`/api/upload/${encodeURIComponent(media.id)}`, { method: "DELETE" });
    if (!response.ok) { const payload = await response.json().catch(() => ({})); setError(payload.error || "The uploaded image could not be removed."); return; }
    URL.revokeObjectURL(media.previewUrl);
    setUploadedMedia((current) => current.filter((item) => item.id !== media.id));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !turnstileToken) { setError("The security check has not completed. Wait for the tick, or check your internet / turn off ad blockers, refresh the page and try again."); event.currentTarget.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
    setLoading(true);
    const formData = new FormData(event.currentTarget);
    const data: Record<string, FormDataEntryValue | string[]> = Object.fromEntries(formData.entries());
    data.category = category; data.mediaIds = uploadedMedia.map((media) => media.id); data.turnstileToken = turnstileToken;
    try {
      const response = await fetch("/api/listings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Failed to create listing");
      router.push("/dashboard?listingSubmitted=1");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Failed to submit listing."); }
    finally { setLoading(false); }
  }

  return <div className="flex min-h-full flex-col bg-[#EAF6F1]"><main className="enes-container flex-1 py-8 sm:py-12"><div className="mx-auto max-w-3xl">
    <div className="mb-6"><p className="enes-kicker">Seller workspace</p><h1 className="mt-2 text-[31px] font-extrabold tracking-[-.05em] text-[#04180C] sm:text-[38px]">Create a listing</h1><p className="mt-2 max-w-xl text-[12px] leading-6 text-[#69756E]">Choose the right category first. The details below change to match what you are listing.</p></div>
    <div className="mb-4 flex items-center gap-2"><span className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-extrabold ${step===1?"bg-[#006B1D] text-white":"bg-[#D8E7DE] text-[#006B1D]"}`}>1</span><span className="text-[10px] font-extrabold text-[#04180C]">Category & details</span><span className="mx-2 h-px flex-1 bg-[#DAD4C9]"/><span className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-extrabold ${step===2?"bg-[#006B1D] text-white":"bg-[#E9E3D9] text-[#7D877F]"}`}>2</span><span className="text-[10px] font-extrabold text-[#04180C]">Photos & contact</span></div>
    <form onSubmit={onSubmit} className="rounded-[17px] border border-[#D5E5DC] bg-[#FFFFFF] p-5 sm:p-8">
      {error&&<div role="alert" className="mb-5 rounded-[9px] bg-[#FBE9E9] p-3 text-[12px] font-semibold text-[#A33333]">{error}</div>}
      <div data-step="1" className={step===1 ? "block" : "hidden"}>
        <div><p className="text-[13px] font-extrabold text-[#04180C]">What are you listing?</p><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{categories.map(({value,label,description,Icon})=><button type="button" key={value} onClick={()=>setCategory(value)} className={`flex min-h-[118px] flex-col items-start rounded-[12px] border p-3 text-left transition ${category===value?"border-[#006B1D] bg-[#DDF1E6] ring-1 ring-[#006B1D]":"border-[#D5E5DC] bg-white hover:border-[#B8CFC3]"}`}><Icon className={`h-5 w-5 ${category===value?"text-[#006B1D]":"text-[#89938C]"}`}/><span className="mt-4 text-[11px] font-extrabold text-[#04180C]">{label}</span><span className="mt-1 text-[9px] leading-4 text-[#77827B]">{description}</span></button>)}</div></div>
        <div className="mt-7 grid gap-4 sm:grid-cols-2"><label><span className="enes-label">Listing title</span><input required maxLength={120} name="title" className="enes-field" placeholder={category==="Property"?"e.g. 3-bedroom apartment in Awka":category==="Cars"?"e.g. Toyota Corolla 2018":"Describe the item clearly"}/></label><label><span className="enes-label">Subcategory</span><input name="subCategory" required={category==="Marketplace"} maxLength={100} className="enes-field" placeholder={category==="Property"?"e.g. Duplex, Land, Flat":category==="Cars"?"e.g. SUV, Sedan":"e.g. Sofa, Refrigerator"}/></label></div>
        {category==="Property"&&<div className="mt-5 rounded-[12px] bg-[#EAF6F1] p-4"><p className="text-[11px] font-extrabold text-[#04180C]">Property details</p><div className="mt-3 grid gap-3 sm:grid-cols-2"><label><span className="enes-label">Listing purpose</span><select name="intent" required className="enes-field"><option value="">Choose sale or rent</option><option value="FOR_SALE">For sale</option><option value="FOR_RENT">For rent</option><option value="LAND_FOR_SALE">Land for sale</option><option value="COMMERCIAL_FOR_RENT">Commercial rent</option><option value="COMMERCIAL_FOR_SALE">Commercial sale</option><option value="SHORT_LET">Short let</option></select></label><label><span className="enes-label">Property type</span><select name="propertyType" required className="enes-field"><option value="">Choose type</option>{["House","Apartment","Flat","Duplex","Bungalow","Land","Commercial","Warehouse","Office","Shop","Other"].map((item)=><option key={item}>{item}</option>)}</select></label><label><span className="enes-label">Bedrooms</span><input name="bedrooms" type="number" min="0" max="100" className="enes-field" placeholder="Not applicable for land"/></label><label><span className="enes-label">Bathrooms</span><input name="bathrooms" type="number" min="0" max="100" step="0.5" className="enes-field"/></label><label><span className="enes-label">Land size</span><input name="landSize" maxLength={80} className="enes-field" placeholder="e.g. 500 sqm"/></label><label><span className="enes-label">Furnishing</span><select name="furnishing" className="enes-field"><option value="">Not specified</option><option>Furnished</option><option>Unfurnished</option><option>Partly furnished</option></select></label></div></div>}
        {category==="Cars"&&<div className="mt-5 rounded-[12px] bg-[#EAF6F1] p-4"><p className="text-[11px] font-extrabold text-[#04180C]">Vehicle details</p><div className="mt-3 grid gap-3 sm:grid-cols-2"><label><span className="enes-label">Make</span><input name="make" required maxLength={80} className="enes-field" placeholder="e.g. Toyota"/></label><label><span className="enes-label">Model</span><input name="model" required maxLength={80} className="enes-field" placeholder="e.g. Corolla"/></label><label><span className="enes-label">Year</span><input name="vehicleYear" type="number" min="1900" max={new Date().getFullYear()+1} className="enes-field"/></label><label><span className="enes-label">Mileage (km)</span><input name="mileage" type="number" min="0" className="enes-field"/></label><label><span className="enes-label">Condition</span><select name="condition" required className="enes-field"><option value="">Choose condition</option><option>New</option><option>Foreign Used</option><option>Nigerian Used</option></select></label><label><span className="enes-label">Transmission</span><select name="transmission" className="enes-field"><option value="">Not specified</option><option>Automatic</option><option>Manual</option><option>CVT</option></select></label><label><span className="enes-label">Fuel type</span><select name="fuelType" className="enes-field"><option value="">Not specified</option><option>Petrol</option><option>Diesel</option><option>Hybrid</option><option>Electric</option><option>Other</option></select></label></div></div>}
        {(category==="Home & Living"||category==="Marketplace")&&<div className="mt-5 rounded-[12px] bg-[#EAF6F1] p-4"><p className="text-[11px] font-extrabold text-[#04180C]">Item details</p><div className="mt-3 grid gap-3 sm:grid-cols-2"><label><span className="enes-label">Condition</span><select name="condition" required className="enes-field"><option value="">Choose condition</option><option>New</option><option>Used</option><option>Refurbished</option></select></label><label><span className="enes-label">Brand (optional)</span><input name="itemBrand" maxLength={80} className="enes-field"/></label><label><span className="enes-label">Dimensions or size</span><input name="itemDimensions" maxLength={80} className="enes-field" placeholder="Optional"/></label><label><span className="enes-label">Quantity</span><input name="quantity" type="number" min="1" max="100000" className="enes-field" placeholder="Optional"/></label><label className="flex min-h-12 items-center gap-2 sm:col-span-2"><input type="checkbox" name="deliveryAvailable" value="true" className="h-4 w-4 accent-[#006B1D]"/><span className="text-[11px] font-bold text-[#415149]">Delivery available</span></label></div></div>}
        <div className="mt-5 grid gap-3 sm:grid-cols-2"><label><span className="enes-label">Price (₦)</span><input required name="price" type="number" min="0" max="2000000000" step="1" className="enes-field"/></label><label><span className="enes-label">Price period (if applicable)</span><select name="pricePeriod" className="enes-field"><option value="">One-time / not specified</option><option value="per annum">Per annum</option><option value="per month">Per month</option><option value="per week">Per week</option><option value="per day">Per day</option></select></label></div>
        <label className="mt-4 block"><span className="enes-label">Description</span><textarea required name="description" maxLength={12000} minLength={30} rows={6} className="enes-field !h-auto" placeholder="Include the details a buyer needs to understand the listing. Be specific and accurate."/></label>
        <div className="mt-5 grid gap-3 sm:grid-cols-3"><label><span className="enes-label">State</span><select required name="state" className="enes-field"><option value="">Select state</option>{NIGERIAN_STATES.map((item)=><option key={item}>{item}</option>)}</select></label><label><span className="enes-label">City or town</span><input required maxLength={100} name="city" className="enes-field"/></label><label><span className="enes-label">Area (optional)</span><input maxLength={120} name="area" className="enes-field"/></label></div>
        {stepError&&<div role="alert" className="mt-5 rounded-[9px] bg-[#FBE9E9] p-3 text-[12px] font-semibold text-[#A33333]">{stepError}</div>}
        <div className="mt-6 flex justify-end"><button type="button" onClick={continueToPhotos} className="enes-button">Continue to photos <ArrowUpRightIcon/></button></div>
      </div>
      <div data-step="2" className={step===2 ? "block" : "hidden"}>
        <div className="flex items-start justify-between gap-4"><div><p className="text-[13px] font-extrabold text-[#04180C]">Photos & contact</p><p className="mt-1 text-[11px] leading-5 text-[#758079]">Upload original photos that represent the item or property being listed.</p></div><button type="button" onClick={()=>setStep(1)} className="text-[10px] font-extrabold text-[#006B1D]">Edit details</button></div>
        <div className="mt-5 rounded-[12px] border border-dashed border-[#CFC8BB] bg-[#F0F8F4] p-4"><label className="flex min-h-16 cursor-pointer items-center justify-center gap-3 rounded-[9px] bg-white px-3 py-4 text-[12px] font-extrabold text-[#006B1D] hover:bg-[#DDF1E6]"><UploadCloud className="h-5 w-5"/>{uploading?"Uploading securely…":"Choose up to 10 photos"}<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleFileUpload} className="sr-only" disabled={uploading||uploadedMedia.length>=10}/></label><p className="mt-3 text-[10px] leading-5 text-[#7A857D]">JPEG, PNG or WebP · Up to 5 MB each · Photos stay private until ENES has reviewed them.</p></div>
        {uploadedMedia.length>0&&<div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5">{uploadedMedia.map((media)=><div key={media.id} className="relative overflow-hidden rounded-[9px] border border-[#D5E5DC]"><img src={media.previewUrl} alt={media.name} className="aspect-square w-full object-cover"/><button type="button" onClick={()=>removeUploadedMedia(media)} aria-label={`Remove ${media.name}`} className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-[#04180C]/85 text-white"><X className="h-3.5 w-3.5"/></button></div>)}</div>}
        <div className="mt-6 rounded-[12px] bg-[#EAF6F1] p-4"><p className="text-[11px] font-extrabold text-[#04180C]">Private contact</p><p className="mt-1 text-[10px] leading-5 text-[#6E7971]">Only ENES sees this number. ENES handles buyer inquiries and contacts you directly.</p><label className="mt-4 block"><span className="enes-label">WhatsApp number</span><input required name="sellerPhone" type="tel" maxLength={24} className="enes-field" placeholder="e.g. 08012345678"/></label></div>
        <div className="mt-6 rounded-[10px] border border-[#D5E5DC] p-4"><div className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#006B1D]"/><p className="text-[10px] leading-5 text-[#68736D]">Submitting sends this listing to ENES review. It will not appear publicly until the listing and its media have been approved.</p></div></div>
        <div className="mt-5"><TurnstileWidget onVerify={setTurnstileToken}/></div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><button type="button" onClick={()=>setStep(1)} className="text-[11px] font-extrabold text-[#68736D]">Back to details</button><Button type="submit" disabled={loading||uploading}>{loading?"Submitting…":"Submit for review"}</Button></div>
      </div>
    </form>
    <p className="mt-4 text-center text-[10px] text-[#7C867F]">Listing on ENES is free.</p>
  </div></main></div>;
}

function ArrowUpRightIcon(){return <span aria-hidden="true">↗</span>}
