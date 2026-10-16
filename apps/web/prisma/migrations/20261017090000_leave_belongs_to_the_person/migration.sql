-- Leave belongs to the person, not their volunteer record, so staff with no
-- volunteer record can log theirs too. Existing rows keep their data: each
-- takes the user behind the volunteer record it was logged against.

-- RenameTable
ALTER TABLE "VolunteerLeave" RENAME TO "Leave";
ALTER TABLE "Leave" RENAME CONSTRAINT "VolunteerLeave_pkey" TO "Leave_pkey";
ALTER TABLE "Leave" RENAME CONSTRAINT "VolunteerLeave_createdById_fkey" TO "Leave_createdById_fkey";
ALTER INDEX "VolunteerLeave_endsOn_startsOn_idx" RENAME TO "Leave_endsOn_startsOn_idx";

-- AddColumn, backfilled from the volunteer record
ALTER TABLE "Leave" ADD COLUMN "userId" TEXT;
UPDATE "Leave" AS l
SET "userId" = vp."userId"
FROM "VolunteerProfile" AS vp
WHERE vp."id" = l."volunteerId";
ALTER TABLE "Leave" ALTER COLUMN "userId" SET NOT NULL;

-- DropForeignKey, DropIndex, DropColumn
ALTER TABLE "Leave" DROP CONSTRAINT "VolunteerLeave_volunteerId_fkey";
DROP INDEX "VolunteerLeave_volunteerId_endsOn_idx";
ALTER TABLE "Leave" DROP COLUMN "volunteerId";

-- CreateIndex
CREATE INDEX "Leave_userId_endsOn_idx" ON "Leave"("userId", "endsOn");

-- AddForeignKey
ALTER TABLE "Leave" ADD CONSTRAINT "Leave_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
