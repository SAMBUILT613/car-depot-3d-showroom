import { getPublishedSiteContent } from "@/lib/site-content";
import { ContentDocumentPage } from "@/components/content/content-document-page";
export const dynamic = "force-dynamic";
export const metadata = { title: "Contact and enquiries" };
export default async function ContactPage() {
  const content = await getPublishedSiteContent();
  return <ContentDocumentPage page={content.pages.contact} />;
}
