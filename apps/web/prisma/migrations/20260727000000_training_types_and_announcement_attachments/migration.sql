-- Training types become editable rows, and pānui gain file attachments.
--
-- The TrainingType enum is converted to a table without losing any existing
-- session. Postgres keeps tables and types in the same namespace, so the enum
-- has to be gone before a table of the same name can be created — hence the
-- detour through a temporary text column rather than a straight ALTER.

-- ─── 1. Park the existing enum values as text ────────────────────────────
ALTER TABLE "TrainingSession" ADD COLUMN "typeKey" TEXT;
UPDATE "TrainingSession" SET "typeKey" = "type"::TEXT;

ALTER TABLE "TrainingSession" DROP COLUMN "type";
DROP TYPE "TrainingType";

-- ─── 2. The new table, seeded with the four types that were the enum ─────
CREATE TABLE "TrainingType" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingType_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TrainingType_key_key" ON "TrainingType"("key");
CREATE UNIQUE INDEX "TrainingType_name_key" ON "TrainingType"("name");

-- Names match the labels the UI already showed for each enum member, so
-- nothing appears to change for staff. Keys are preserved verbatim because the
-- mobile app keys its core-training logic off them.
INSERT INTO "TrainingType" ("id", "key", "name", "description") VALUES
    ('ttype_induction', 'INDUCTION', 'Induction', 'Welcome and orientation for new volunteers'),
    ('ttype_de_escalation', 'DE_ESCALATION', 'De-escalation', 'Handling difficult situations calmly and safely'),
    ('ttype_health_safety', 'HEALTH_SAFETY', 'Health & Safety', 'Kitchen safety, food handling, and emergency procedures'),
    ('ttype_other', 'OTHER', 'Other', 'Anything that does not fit the other types');

-- ─── 3. Point every session at its type ─────────────────────────────────
ALTER TABLE "TrainingSession" ADD COLUMN "typeId" TEXT;

UPDATE "TrainingSession" AS s
SET "typeId" = t."id"
FROM "TrainingType" AS t
WHERE t."key" = s."typeKey";

-- Any row whose key somehow didn't match falls back to "Other" rather than
-- blocking the migration on a NOT NULL it can't satisfy.
UPDATE "TrainingSession" SET "typeId" = 'ttype_other' WHERE "typeId" IS NULL;

ALTER TABLE "TrainingSession" ALTER COLUMN "typeId" SET NOT NULL;
ALTER TABLE "TrainingSession" DROP COLUMN "typeKey";

CREATE INDEX "TrainingSession_typeId_idx" ON "TrainingSession"("typeId");

ALTER TABLE "TrainingSession"
    ADD CONSTRAINT "TrainingSession_typeId_fkey"
    FOREIGN KEY ("typeId") REFERENCES "TrainingType"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── 4. Pānui attachments ───────────────────────────────────────────────
CREATE TABLE "AnnouncementAttachment" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnnouncementAttachment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AnnouncementAttachment_announcementId_idx" ON "AnnouncementAttachment"("announcementId");

ALTER TABLE "AnnouncementAttachment"
    ADD CONSTRAINT "AnnouncementAttachment_announcementId_fkey"
    FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
