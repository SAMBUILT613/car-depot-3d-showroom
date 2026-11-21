-- Support messages and the visitor feed. Safe to run more than once.
CREATE TABLE IF NOT EXISTS "SupportThread" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SupportThread_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SupportThread_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "SupportMessage" (
  "id" TEXT NOT NULL,
  "threadId" TEXT NOT NULL,
  "fromStaff" BOOLEAN NOT NULL DEFAULT false,
  "senderUserId" TEXT,
  "senderName" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SupportMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "SupportThread"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "SiteVisit" (
  "id" TEXT NOT NULL,
  "visitorKey" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "referrer" TEXT,
  "country" TEXT,
  "device" TEXT,
  "isNewVisitor" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SiteVisit_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SupportThread_userId_lastMessageAt_idx" ON "SupportThread"("userId", "lastMessageAt");
CREATE INDEX IF NOT EXISTS "SupportThread_status_lastMessageAt_idx" ON "SupportThread"("status", "lastMessageAt");
CREATE INDEX IF NOT EXISTS "SupportMessage_threadId_createdAt_idx" ON "SupportMessage"("threadId", "createdAt");
CREATE INDEX IF NOT EXISTS "SiteVisit_createdAt_idx" ON "SiteVisit"("createdAt");
CREATE INDEX IF NOT EXISTS "SiteVisit_visitorKey_createdAt_idx" ON "SiteVisit"("visitorKey", "createdAt");
