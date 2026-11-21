// ENES handles every inquiry, so listings must not carry private contact details.
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE = /(?:\+?\s*234|\b0)[\s.\-()]*[789][\s.\-()]*[01](?:[\s.\-()]*\d){8}/;
const CHAT_LINK = /(?:wa\.me|api\.whatsapp\.com|chat\.whatsapp\.com|t\.me|telegram\.me)\b/i;

export const CONTACT_DETAILS_MESSAGE =
  "Please remove phone numbers, email addresses and chat links from the title and description. ENES handles every inquiry and passes it on to you.";

export function findContactDetails(...texts: unknown[]): boolean {
  return texts.some((text) => typeof text === "string" && (EMAIL.test(text) || PHONE.test(text) || CHAT_LINK.test(text)));
}
