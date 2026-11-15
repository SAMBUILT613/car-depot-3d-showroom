import { getPublishedSiteContent } from "@/lib/site-content";
import { ContentDocumentPage } from "@/components/content/content-document-page";
export const dynamic = "force-dynamic";
export const metadata = { title: "About ENES Properties" };
export default async function AboutPage() {
  const content = await getPublishedSiteContent();
  return <ContentDocumentPage page={content.pages.about} />;
}
