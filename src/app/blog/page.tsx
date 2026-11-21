import { getPublishedSiteContent } from "@/lib/site-content";
import { ContentDocumentPage } from "@/components/content/content-document-page";

export const dynamic = "force-dynamic";
export const metadata = { title: "Blog | ENES Properties" };

export default async function BlogPage() {
  const content = await getPublishedSiteContent();
  return <ContentDocumentPage page={content.pages.blog} />;
}
