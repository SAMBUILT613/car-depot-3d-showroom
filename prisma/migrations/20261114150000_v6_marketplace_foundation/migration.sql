
-- ENES V6 guarded reconciliation.
-- Only the five inspected empty prototype tables and optional empty PocItem
-- may be retired. The original Prisma migration history is preserved.
BEGIN;

DO $enes_v6_guard$
DECLARE
  table_rows BIGINT;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM "_prisma_migrations"
    WHERE migration_name = '20261113221212_poc_init'
      AND finished_at IS NOT NULL
      AND rolled_back_at IS NULL
  ) THEN
    RAISE EXCEPTION 'ENES V6 requires the successfully applied original POC migration.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name <> '_prisma_migrations'
      AND table_name NOT IN ('AnalyticsEvent', 'Message', 'Report', 'SavedSearch', 'Listing', 'PocItem')
  ) THEN
    RAISE EXCEPTION 'ENES V6 found an unexpected public table. Migration refused.';
  END IF;


  IF to_regclass('public."AnalyticsEvent"') IS NOT NULL THEN
    EXECUTE format(
      'LOCK TABLE %I.%I IN ACCESS EXCLUSIVE MODE',
      'public',
      'AnalyticsEvent'
    );

    EXECUTE format(
      'SELECT count(*) FROM %I.%I',
      'public',
      'AnalyticsEvent'
    ) INTO table_rows;

    IF table_rows <> 0 THEN
      RAISE EXCEPTION
        'ENES V6 refused to retire AnalyticsEvent: table contains % row(s).',
        table_rows;
    END IF;
  END IF;


  IF to_regclass('public."Message"') IS NOT NULL THEN
    EXECUTE format(
      'LOCK TABLE %I.%I IN ACCESS EXCLUSIVE MODE',
      'public',
      'Message'
    );

    EXECUTE format(
      'SELECT count(*) FROM %I.%I',
      'public',
      'Message'
    ) INTO table_rows;

    IF table_rows <> 0 THEN
      RAISE EXCEPTION
        'ENES V6 refused to retire Message: table contains % row(s).',
        table_rows;
    END IF;
  END IF;


  IF to_regclass('public."Report"') IS NOT NULL THEN
    EXECUTE format(
      'LOCK TABLE %I.%I IN ACCESS EXCLUSIVE MODE',
      'public',
      'Report'
    );

    EXECUTE format(
      'SELECT count(*) FROM %I.%I',
      'public',
      'Report'
    ) INTO table_rows;

    IF table_rows <> 0 THEN
      RAISE EXCEPTION
        'ENES V6 refused to retire Report: table contains % row(s).',
        table_rows;
    END IF;
  END IF;


  IF to_regclass('public."SavedSearch"') IS NOT NULL THEN
    EXECUTE format(
      'LOCK TABLE %I.%I IN ACCESS EXCLUSIVE MODE',
      'public',
      'SavedSearch'
    );

    EXECUTE format(
      'SELECT count(*) FROM %I.%I',
      'public',
      'SavedSearch'
    ) INTO table_rows;

    IF table_rows <> 0 THEN
      RAISE EXCEPTION
        'ENES V6 refused to retire SavedSearch: table contains % row(s).',
        table_rows;
    END IF;
  END IF;


  IF to_regclass('public."Listing"') IS NOT NULL THEN
    EXECUTE format(
      'LOCK TABLE %I.%I IN ACCESS EXCLUSIVE MODE',
      'public',
      'Listing'
    );

    EXECUTE format(
      'SELECT count(*) FROM %I.%I',
      'public',
      'Listing'
    ) INTO table_rows;

    IF table_rows <> 0 THEN
      RAISE EXCEPTION
        'ENES V6 refused to retire Listing: table contains % row(s).',
        table_rows;
    END IF;
  END IF;


  IF to_regclass('public."PocItem"') IS NOT NULL THEN
    EXECUTE format(
      'LOCK TABLE %I.%I IN ACCESS EXCLUSIVE MODE',
      'public',
      'PocItem'
    );

    EXECUTE format(
      'SELECT count(*) FROM %I.%I',
      'public',
      'PocItem'
    ) INTO table_rows;

    IF table_rows <> 0 THEN
      RAISE EXCEPTION
        'ENES V6 refused to retire PocItem: table contains % row(s).',
        table_rows;
    END IF;
  END IF;

END
$enes_v6_guard$;

DROP TABLE IF EXISTS "AnalyticsEvent";
DROP TABLE IF EXISTS "Message";
DROP TABLE IF EXISTS "Report";
DROP TABLE IF EXISTS "SavedSearch";
DROP TABLE IF EXISTS "Listing";
DROP TABLE IF EXISTS "PocItem";


-- DropTable

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "email" TEXT,
    "emailNormalized" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "displayName" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "avatarUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "businessName" TEXT,
    "phone" TEXT,
    "whatsappNumber" TEXT,
    "email" TEXT,
    "state" TEXT,
    "city" TEXT,
    "area" TEXT,
    "bio" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfessionalProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessName" TEXT,
    "serviceTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "serviceAreas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "phone" TEXT,
    "email" TEXT,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfessionalProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Listing" (
    "id" TEXT NOT NULL,
    "slug" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "pricePeriod" TEXT,
    "category" TEXT NOT NULL,
    "categoryId" TEXT,
    "subCategory" TEXT,
    "condition" TEXT,
    "intent" TEXT,
    "propertyType" TEXT,
    "bedrooms" INTEGER,
    "bathrooms" DOUBLE PRECISION,
    "landSize" TEXT,
    "furnishing" TEXT,
    "parkingSpaces" INTEGER,
    "make" TEXT,
    "model" TEXT,
    "vehicleYear" INTEGER,
    "mileage" INTEGER,
    "transmission" TEXT,
    "fuelType" TEXT,
    "itemBrand" TEXT,
    "itemDimensions" TEXT,
    "quantity" INTEGER,
    "deliveryAvailable" BOOLEAN NOT NULL DEFAULT false,
    "state" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "area" TEXT,
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "sellerName" TEXT NOT NULL,
    "sellerPhone" TEXT NOT NULL,
    "sellerEmail" TEXT,
    "sellerId" TEXT,
    "sellerUserId" TEXT,
    "reviewedByAdminId" TEXT,
    "rejectionReason" TEXT,
    "publishedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingVersion" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "changedByClerkId" TEXT,
    "changeReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListingVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingStatusHistory" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "actorClerkId" TEXT,
    "actorAdminId" TEXT,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListingStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorrectionRequest" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "requestedByAdminId" TEXT,
    "instructions" TEXT NOT NULL,
    "requestedFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "resolvedAt" TIMESTAMP(3),
    "resolvedByClerkId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CorrectionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingMedia" (
    "id" TEXT NOT NULL,
    "listingId" TEXT,
    "uploaderUserId" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "bucketName" TEXT NOT NULL,
    "publicUrl" TEXT,
    "originalName" TEXT,
    "mimeType" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "altText" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    "rejectionReason" TEXT,
    "reviewedByAdminId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListingMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "parentId" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoryAttribute" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "fieldType" TEXT NOT NULL,
    "options" JSONB,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CategoryAttribute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "userId" TEXT,
    "sessionHash" TEXT,
    "eventKey" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedSearch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "state" TEXT,
    "keyword" TEXT,
    "maxPrice" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedSearch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedListing" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "listingId" TEXT NOT NULL,
    "reporterUserId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "assignedToAdminId" TEXT,
    "resolution" TEXT,
    "resolvedByClerkId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enquiry" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "senderUserId" TEXT,
    "sellerUserId" TEXT,
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Enquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "subject" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationParticipant" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "participantRole" TEXT NOT NULL DEFAULT 'PARTICIPANT',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReadAt" TIMESTAMP(3),
    "mutedAt" TIMESTAMP(3),

    CONSTRAINT "ConversationParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "senderUserId" TEXT,
    "listingId" TEXT NOT NULL,
    "conversationId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'VISIBLE',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageModeration" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "moderatorId" TEXT,
    "reporterUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageModeration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBlock" (
    "id" TEXT NOT NULL,
    "blockerId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "intent" TEXT,
    "propertyType" TEXT,
    "state" TEXT,
    "city" TEXT,
    "area" TEXT,
    "minBudget" INTEGER,
    "maxBudget" INTEGER,
    "bedrooms" INTEGER,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "assignedToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyManagementService" (
    "id" TEXT NOT NULL,
    "providerUserId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT,
    "serviceType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "serviceAreas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "pricingType" TEXT,
    "startingPrice" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    "reviewedByAdminId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyManagementService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceEnquiry" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "senderUserId" TEXT,
    "providerUserId" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceEnquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationDelivery" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "providerId" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationRecord" (
    "id" TEXT NOT NULL,
    "subjectType" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "listingId" TEXT,
    "verificationType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "publicLabel" TEXT,
    "evidenceKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "reviewerUserId" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "internalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "consentType" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "dedupeKey" TEXT,
    "eventType" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "metadata" JSONB,
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "isOwner" BOOLEAN NOT NULL DEFAULT false,
    "invitedAt" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "suspendedAt" TIMESTAMP(3),
    "removedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUserRole" (
    "adminUserId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "assignedById" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AdminInvitation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailNormalized" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "invitedByAdminId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminInvitationRole" (
    "invitationId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorAdminId" TEXT,
    "actorClerkId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "metadata" JSONB,
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimitBucket" (
    "id" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "bucketStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_clerkId_key" ON "User"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "User_emailNormalized_key" ON "User"("emailNormalized");

-- CreateIndex
CREATE INDEX "User_status_createdAt_idx" ON "User"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SellerProfile_userId_key" ON "SellerProfile"("userId");

-- CreateIndex
CREATE INDEX "SellerProfile_state_city_idx" ON "SellerProfile"("state", "city");

-- CreateIndex
CREATE UNIQUE INDEX "ProfessionalProfile_userId_key" ON "ProfessionalProfile"("userId");

-- CreateIndex
CREATE INDEX "ProfessionalProfile_status_createdAt_idx" ON "ProfessionalProfile"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Listing_slug_key" ON "Listing"("slug");

-- CreateIndex
CREATE INDEX "Listing_status_createdAt_idx" ON "Listing"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Listing_category_status_createdAt_idx" ON "Listing"("category", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Listing_state_city_status_idx" ON "Listing"("state", "city", "status");

-- CreateIndex
CREATE INDEX "Listing_sellerUserId_createdAt_idx" ON "Listing"("sellerUserId", "createdAt");

-- CreateIndex
CREATE INDEX "Listing_sellerId_createdAt_idx" ON "Listing"("sellerId", "createdAt");

-- CreateIndex
CREATE INDEX "Listing_intent_state_city_status_idx" ON "Listing"("intent", "state", "city", "status");

-- CreateIndex
CREATE INDEX "ListingVersion_listingId_createdAt_idx" ON "ListingVersion"("listingId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ListingVersion_listingId_version_key" ON "ListingVersion"("listingId", "version");

-- CreateIndex
CREATE INDEX "ListingStatusHistory_listingId_createdAt_idx" ON "ListingStatusHistory"("listingId", "createdAt");

-- CreateIndex
CREATE INDEX "ListingStatusHistory_toStatus_createdAt_idx" ON "ListingStatusHistory"("toStatus", "createdAt");

-- CreateIndex
CREATE INDEX "CorrectionRequest_listingId_status_idx" ON "CorrectionRequest"("listingId", "status");

-- CreateIndex
CREATE INDEX "CorrectionRequest_status_createdAt_idx" ON "CorrectionRequest"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ListingMedia_objectKey_key" ON "ListingMedia"("objectKey");

-- CreateIndex
CREATE INDEX "ListingMedia_listingId_status_sortOrder_idx" ON "ListingMedia"("listingId", "status", "sortOrder");

-- CreateIndex
CREATE INDEX "ListingMedia_uploaderUserId_status_createdAt_idx" ON "ListingMedia"("uploaderUserId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ListingMedia_status_createdAt_idx" ON "ListingMedia"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Category_parentId_sortOrder_idx" ON "Category"("parentId", "sortOrder");

-- CreateIndex
CREATE INDEX "Category_isActive_sortOrder_idx" ON "Category"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "CategoryAttribute_categoryId_sortOrder_idx" ON "CategoryAttribute"("categoryId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryAttribute_categoryId_key_key" ON "CategoryAttribute"("categoryId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsEvent_eventKey_key" ON "AnalyticsEvent"("eventKey");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_type_createdAt_idx" ON "AnalyticsEvent"("type", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_listingId_type_createdAt_idx" ON "AnalyticsEvent"("listingId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "SavedSearch_userId_createdAt_idx" ON "SavedSearch"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SavedSearch_category_state_idx" ON "SavedSearch"("category", "state");

-- CreateIndex
CREATE INDEX "SavedListing_userId_createdAt_idx" ON "SavedListing"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SavedListing_userId_listingId_key" ON "SavedListing"("userId", "listingId");

-- CreateIndex
CREATE INDEX "Report_status_createdAt_idx" ON "Report"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Report_listingId_createdAt_idx" ON "Report"("listingId", "createdAt");

-- CreateIndex
CREATE INDEX "Report_reporterUserId_createdAt_idx" ON "Report"("reporterUserId", "createdAt");

-- CreateIndex
CREATE INDEX "Enquiry_listingId_createdAt_idx" ON "Enquiry"("listingId", "createdAt");

-- CreateIndex
CREATE INDEX "Enquiry_sellerUserId_status_createdAt_idx" ON "Enquiry"("sellerUserId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Conversation_listingId_updatedAt_idx" ON "Conversation"("listingId", "updatedAt");

-- CreateIndex
CREATE INDEX "Conversation_createdByUserId_status_updatedAt_idx" ON "Conversation"("createdByUserId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "Conversation_status_lastMessageAt_idx" ON "Conversation"("status", "lastMessageAt");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_listingId_createdByUserId_key" ON "Conversation"("listingId", "createdByUserId");

-- CreateIndex
CREATE INDEX "ConversationParticipant_userId_joinedAt_idx" ON "ConversationParticipant"("userId", "joinedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationParticipant_conversationId_userId_key" ON "ConversationParticipant"("conversationId", "userId");

-- CreateIndex
CREATE INDEX "Message_listingId_createdAt_idx" ON "Message"("listingId", "createdAt");

-- CreateIndex
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "Message_senderUserId_createdAt_idx" ON "Message"("senderUserId", "createdAt");

-- CreateIndex
CREATE INDEX "MessageModeration_messageId_createdAt_idx" ON "MessageModeration"("messageId", "createdAt");

-- CreateIndex
CREATE INDEX "MessageModeration_action_createdAt_idx" ON "MessageModeration"("action", "createdAt");

-- CreateIndex
CREATE INDEX "UserBlock_blockedId_createdAt_idx" ON "UserBlock"("blockedId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserBlock_blockerId_blockedId_key" ON "UserBlock"("blockerId", "blockedId");

-- CreateIndex
CREATE INDEX "PropertyRequest_status_createdAt_idx" ON "PropertyRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PropertyRequest_userId_createdAt_idx" ON "PropertyRequest"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyManagementService_slug_key" ON "PropertyManagementService"("slug");

-- CreateIndex
CREATE INDEX "PropertyManagementService_status_serviceType_createdAt_idx" ON "PropertyManagementService"("status", "serviceType", "createdAt");

-- CreateIndex
CREATE INDEX "PropertyManagementService_state_city_status_idx" ON "PropertyManagementService"("state", "city", "status");

-- CreateIndex
CREATE INDEX "PropertyManagementService_providerUserId_status_createdAt_idx" ON "PropertyManagementService"("providerUserId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ServiceEnquiry_serviceId_createdAt_idx" ON "ServiceEnquiry"("serviceId", "createdAt");

-- CreateIndex
CREATE INDEX "ServiceEnquiry_providerUserId_status_createdAt_idx" ON "ServiceEnquiry"("providerUserId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ServiceEnquiry_senderUserId_createdAt_idx" ON "ServiceEnquiry"("senderUserId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "NotificationDelivery_status_createdAt_idx" ON "NotificationDelivery"("status", "createdAt");

-- CreateIndex
CREATE INDEX "NotificationDelivery_notificationId_channel_idx" ON "NotificationDelivery"("notificationId", "channel");

-- CreateIndex
CREATE INDEX "VerificationRecord_subjectType_subjectId_status_idx" ON "VerificationRecord"("subjectType", "subjectId", "status");

-- CreateIndex
CREATE INDEX "VerificationRecord_status_requestedAt_idx" ON "VerificationRecord"("status", "requestedAt");

-- CreateIndex
CREATE INDEX "ConsentRecord_userId_consentType_createdAt_idx" ON "ConsentRecord"("userId", "consentType", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SecurityEvent_dedupeKey_key" ON "SecurityEvent"("dedupeKey");

-- CreateIndex
CREATE INDEX "SecurityEvent_userId_createdAt_idx" ON "SecurityEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SecurityEvent_eventType_createdAt_idx" ON "SecurityEvent"("eventType", "createdAt");

-- CreateIndex
CREATE INDEX "SecurityEvent_severity_createdAt_idx" ON "SecurityEvent"("severity", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_userId_key" ON "AdminUser"("userId");

-- CreateIndex
CREATE INDEX "AdminUser_status_createdAt_idx" ON "AdminUser"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Role_key_key" ON "Role"("key");

-- CreateIndex
CREATE INDEX "Role_isSystem_name_idx" ON "Role"("isSystem", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_key_key" ON "Permission"("key");

-- CreateIndex
CREATE INDEX "AdminUserRole_roleId_idx" ON "AdminUserRole"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUserRole_adminUserId_roleId_key" ON "AdminUserRole"("adminUserId", "roleId");

-- CreateIndex
CREATE INDEX "RolePermission_permissionId_idx" ON "RolePermission"("permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_roleId_permissionId_key" ON "RolePermission"("roleId", "permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "AdminInvitation_tokenHash_key" ON "AdminInvitation"("tokenHash");

-- CreateIndex
CREATE INDEX "AdminInvitation_emailNormalized_status_createdAt_idx" ON "AdminInvitation"("emailNormalized", "status", "createdAt");

-- CreateIndex
CREATE INDEX "AdminInvitation_expiresAt_status_idx" ON "AdminInvitation"("expiresAt", "status");

-- CreateIndex
CREATE INDEX "AdminInvitationRole_roleId_idx" ON "AdminInvitationRole"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "AdminInvitationRole_invitationId_roleId_key" ON "AdminInvitationRole"("invitationId", "roleId");

-- CreateIndex
CREATE INDEX "AuditLog_actorAdminId_createdAt_idx" ON "AuditLog"("actorAdminId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_createdAt_idx" ON "AuditLog"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "RateLimitBucket_expiresAt_idx" ON "RateLimitBucket"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "RateLimitBucket_keyHash_route_bucketStart_key" ON "RateLimitBucket"("keyHash", "route", "bucketStart");

-- AddForeignKey
ALTER TABLE "SellerProfile" ADD CONSTRAINT "SellerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalProfile" ADD CONSTRAINT "ProfessionalProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_sellerUserId_fkey" FOREIGN KEY ("sellerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_reviewedByAdminId_fkey" FOREIGN KEY ("reviewedByAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingVersion" ADD CONSTRAINT "ListingVersion_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingStatusHistory" ADD CONSTRAINT "ListingStatusHistory_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingStatusHistory" ADD CONSTRAINT "ListingStatusHistory_actorAdminId_fkey" FOREIGN KEY ("actorAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrectionRequest" ADD CONSTRAINT "CorrectionRequest_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrectionRequest" ADD CONSTRAINT "CorrectionRequest_requestedByAdminId_fkey" FOREIGN KEY ("requestedByAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingMedia" ADD CONSTRAINT "ListingMedia_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingMedia" ADD CONSTRAINT "ListingMedia_uploaderUserId_fkey" FOREIGN KEY ("uploaderUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingMedia" ADD CONSTRAINT "ListingMedia_reviewedByAdminId_fkey" FOREIGN KEY ("reviewedByAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryAttribute" ADD CONSTRAINT "CategoryAttribute_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedSearch" ADD CONSTRAINT "SavedSearch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedListing" ADD CONSTRAINT "SavedListing_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedListing" ADD CONSTRAINT "SavedListing_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterUserId_fkey" FOREIGN KEY ("reporterUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_assignedToAdminId_fkey" FOREIGN KEY ("assignedToAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_sellerUserId_fkey" FOREIGN KEY ("sellerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageModeration" ADD CONSTRAINT "MessageModeration_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageModeration" ADD CONSTRAINT "MessageModeration_reporterUserId_fkey" FOREIGN KEY ("reporterUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageModeration" ADD CONSTRAINT "MessageModeration_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBlock" ADD CONSTRAINT "UserBlock_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBlock" ADD CONSTRAINT "UserBlock_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyRequest" ADD CONSTRAINT "PropertyRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyRequest" ADD CONSTRAINT "PropertyRequest_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyManagementService" ADD CONSTRAINT "PropertyManagementService_providerUserId_fkey" FOREIGN KEY ("providerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyManagementService" ADD CONSTRAINT "PropertyManagementService_reviewedByAdminId_fkey" FOREIGN KEY ("reviewedByAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceEnquiry" ADD CONSTRAINT "ServiceEnquiry_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "PropertyManagementService"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceEnquiry" ADD CONSTRAINT "ServiceEnquiry_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceEnquiry" ADD CONSTRAINT "ServiceEnquiry_providerUserId_fkey" FOREIGN KEY ("providerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationRecord" ADD CONSTRAINT "VerificationRecord_reviewerUserId_fkey" FOREIGN KEY ("reviewerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationRecord" ADD CONSTRAINT "VerificationRecord_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityEvent" ADD CONSTRAINT "SecurityEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminUser" ADD CONSTRAINT "AdminUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminUserRole" ADD CONSTRAINT "AdminUserRole_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminUserRole" ADD CONSTRAINT "AdminUserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminUserRole" ADD CONSTRAINT "AdminUserRole_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminInvitation" ADD CONSTRAINT "AdminInvitation_invitedByAdminId_fkey" FOREIGN KEY ("invitedByAdminId") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminInvitationRole" ADD CONSTRAINT "AdminInvitationRole_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "AdminInvitation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminInvitationRole" ADD CONSTRAINT "AdminInvitationRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorAdminId_fkey" FOREIGN KEY ("actorAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorClerkId_fkey" FOREIGN KEY ("actorClerkId") REFERENCES "User"("clerkId") ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;
