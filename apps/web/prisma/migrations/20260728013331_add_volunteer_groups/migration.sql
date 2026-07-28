-- CreateEnum
CREATE TYPE "GroupTone" AS ENUM ('BRAND', 'INFO', 'SUCCESS', 'WARNING', 'NEUTRAL');

-- CreateTable
CREATE TABLE "VolunteerGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "tone" "GroupTone" NOT NULL DEFAULT 'NEUTRAL',
    "visibleToVolunteers" BOOLEAN NOT NULL DEFAULT true,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VolunteerGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_VolunteerGroupMembers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_VolunteerGroupMembers_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "VolunteerGroup_name_key" ON "VolunteerGroup"("name");

-- CreateIndex
CREATE INDEX "_VolunteerGroupMembers_B_index" ON "_VolunteerGroupMembers"("B");

-- AddForeignKey
ALTER TABLE "_VolunteerGroupMembers" ADD CONSTRAINT "_VolunteerGroupMembers_A_fkey" FOREIGN KEY ("A") REFERENCES "VolunteerGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_VolunteerGroupMembers" ADD CONSTRAINT "_VolunteerGroupMembers_B_fkey" FOREIGN KEY ("B") REFERENCES "VolunteerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
