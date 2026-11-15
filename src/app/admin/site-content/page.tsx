import { requireAdminPage } from "@/lib/auth";
import { getAdminSiteContentRecord, mergeSiteContent } from "@/lib/site-content";
import { SiteContentEditor } from "@/components/admin/site-content-editor";

export const dynamic = "force-dynamic";

export default async function AdminSiteContentPage() {
  const actor = await requireAdminPage("content:manage");
  const record = await getAdminSiteContentRecord();
  return <SiteContentEditor
    initialDraft={mergeSiteContent(record.draft)}
    initialDraftVersion={record.draftVersion}
    publishedVersion={record.publishedVersion}
    publishedAt={record.publishedAt}
    revisions={record.revisions.map((revision) => ({ ...revision, createdAt: revision.createdAt.toISOString() }))}
    canPublish={actor.isOwner}
  />;
}
