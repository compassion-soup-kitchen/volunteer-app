-- Case-insensitive uniqueness for volunteer group names.
--
-- The application check is a SELECT before the INSERT, so two saves racing with
-- differently-cased names ("Team Leaders" / "team leaders") could both pass it.
-- `nameKey` holds the lowercased name and carries the unique index, making the
-- invariant the database's job.

-- AlterTable: add nullable first so existing rows can be backfilled.
ALTER TABLE "VolunteerGroup" ADD COLUMN "nameKey" TEXT;

UPDATE "VolunteerGroup" SET "nameKey" = lower("name");

ALTER TABLE "VolunteerGroup" ALTER COLUMN "nameKey" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "VolunteerGroup_nameKey_key" ON "VolunteerGroup"("nameKey");
