import { Resend } from "resend";

type EmailResult = { sent: boolean; providerId?: string; reason?: string };

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character] ?? character);
}

function getAppUrl() {
  const value = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!value) return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" && process.env.NODE_ENV === "production") return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

async function sendEmail(to: string, subject: string, html: string): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from || apiKey === "re_placeholder" || !from.includes("@")) {
    return { sent: false, reason: "EMAIL_PROVIDER_NOT_CONFIGURED" };
  }
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return { sent: false, reason: "INVALID_RECIPIENT" };

  try {
    const resend = new Resend(apiKey);
    const result = await resend.emails.send({ from, to, subject, html });
    if (result.error) {
      console.error("[ENES_EMAIL_PROVIDER_ERROR]", result.error.name);
      return { sent: false, reason: "PROVIDER_REJECTED" };
    }
    return { sent: true, providerId: result.data?.id };
  } catch (error) {
    console.error("[ENES_EMAIL_SEND_ERROR]", error instanceof Error ? error.name : "UnknownError");
    return { sent: false, reason: "PROVIDER_ERROR" };
  }
}

export async function sendNewListingAdminEmail(title: string, sellerName: string, listingId: string) {
  const recipient = process.env.ENES_ADMIN_EMAIL;
  const baseUrl = getAppUrl();
  if (!recipient || !baseUrl) return { sent: false, reason: "EMAIL_PROVIDER_NOT_CONFIGURED" } satisfies EmailResult;
  return sendEmail(
    recipient,
    `New listing pending review: ${title}`,
    `<h2>New listing submitted</h2><p>${escapeHtml(sellerName)} submitted <strong>${escapeHtml(title)}</strong>.</p><p><a href="${baseUrl}/admin/listings">Open the ENES review queue</a></p><p>Listing reference: ${escapeHtml(listingId)}</p>`,
  );
}

export async function sendListingApprovedEmail(sellerEmail: string, title: string, listingId: string) {
  const baseUrl = getAppUrl();
  if (!baseUrl) return { sent: false, reason: "APP_URL_NOT_CONFIGURED" } satisfies EmailResult;
  return sendEmail(
    sellerEmail,
    `Your ENES listing is published: ${title}`,
    `<h2>Your listing is published</h2><p><strong>${escapeHtml(title)}</strong> has been approved for publication on ENES Properties.</p><p><a href="${baseUrl}/listing/${encodeURIComponent(listingId)}">View your listing</a></p><p>Publication approval is not a confirmation of property ownership or title.</p>`,
  );
}

export async function sendAdminInvitationEmail(input: { email: string; token: string; roleNames: string[] }) {
  const baseUrl = getAppUrl();
  if (!baseUrl) return { sent: false, reason: "APP_URL_NOT_CONFIGURED" } satisfies EmailResult;
  const inviteUrl = `${baseUrl}/admin/accept?token=${encodeURIComponent(input.token)}`;
  const roles = input.roleNames.map(escapeHtml).join(", ");
  return sendEmail(
    input.email,
    "Your ENES Properties administrator invitation",
    `<h2>Administrator invitation</h2><p>You have been invited to help administer ENES Properties.</p><p>Assigned role(s): ${roles}</p><p><a href="${inviteUrl}">Accept administrator invitation</a></p><p>This invitation expires in 72 hours. Do not forward this link.</p>`,
  );
}

export async function sendNotificationEmail(input: { email: string; subject: string; title: string; body: string; href?: string }) {
  const baseUrl = getAppUrl();
  const link = input.href && baseUrl ? `<p><a href="${baseUrl}${input.href.startsWith("/") ? input.href : `/${input.href}`}">Open ENES Properties</a></p>` : "";
  return sendEmail(
    input.email,
    input.subject,
    `<h2>${escapeHtml(input.title)}</h2><p>${escapeHtml(input.body)}</p>${link}`,
  );
}
