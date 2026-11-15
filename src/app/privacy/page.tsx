import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { getPublishedSiteContent } from "@/lib/site-content";
import { ContentDocumentPage } from "@/components/content/content-document-page";

export const dynamic = "force-dynamic";

export default async function LegalPage() {
  const content = await getPublishedSiteContent();
  const managed = content.pages.privacy;
  if (managed.title.trim() && (managed.description.trim() || managed.sections.length > 0)) return <ContentDocumentPage page={managed} />;
  return (
    <div className="flex min-h-screen flex-col bg-paper-50">
      <Header />
      <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-12">
        <h1 className="text-[30px] font-bold text-ink-900 mb-6 capitalize">privacy Policy</h1>
        <div className="rounded-card border border-line-200 bg-white p-8 space-y-4 text-[15px] text-muted-600">
          <p><strong>Notice:</strong> This is a placeholder page. The final legal copy is currently under review by ENES Properties management.</p>
          <p>ENES Properties provides a platform for users to list and discover properties and goods across Nigeria. We do not process payments, hold funds, or guarantee transactions.</p>
          <p>For immediate assistance, please contact our support team at enespropertyrealtors@gmail.com.</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
