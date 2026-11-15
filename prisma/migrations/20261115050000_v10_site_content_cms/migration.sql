-- ENES V10: additive, versioned website content management.
-- No existing marketplace tables or records are altered or deleted.
BEGIN;

CREATE TABLE "SiteContent" (
  "key" TEXT NOT NULL,
  "draft" JSONB NOT NULL,
  "published" JSONB,
  "draftVersion" INTEGER NOT NULL DEFAULT 0,
  "publishedVersion" INTEGER NOT NULL DEFAULT 0,
  "publishedAt" TIMESTAMP(3),
  "publishedByClerkId" TEXT,
  "updatedByClerkId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SiteContent_pkey" PRIMARY KEY ("key")
);

CREATE TABLE "SiteContentRevision" (
  "id" TEXT NOT NULL,
  "siteContentKey" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "content" JSONB NOT NULL,
  "createdByClerkId" TEXT NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SiteContentRevision_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SiteContentRevision_siteContentKey_fkey"
    FOREIGN KEY ("siteContentKey") REFERENCES "SiteContent"("key") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "SiteContentRevision_siteContentKey_version_key"
  ON "SiteContentRevision"("siteContentKey", "version");
CREATE INDEX "SiteContentRevision_siteContentKey_createdAt_idx"
  ON "SiteContentRevision"("siteContentKey", "createdAt");

COMMIT;
