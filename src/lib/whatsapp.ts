export function generateWhatsAppLink(phone: string, listingTitle: string, listingId: string, baseUrl: string) {
  const digits = phone.replace(/\D/g, "");
  const cleanPhone = digits.startsWith("0") ? `234${digits.slice(1)}` : digits;
  if (!/^234[789][01]\d{8}$/.test(cleanPhone) && !/^\d{10,15}$/.test(cleanPhone)) return "";
  const listingUrl = baseUrl ? `${baseUrl.replace(/\/$/, "")}/listing/${encodeURIComponent(listingId)}` : "";
  const message = `Hello, I'm asking about ${listingTitle} (ENES Ref: ${listingId})${listingUrl ? `: ${listingUrl}` : ""}`;
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}
