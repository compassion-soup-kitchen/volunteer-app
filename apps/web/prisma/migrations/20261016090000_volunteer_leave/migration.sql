-- CreateTable
CREATE TABLE "VolunteerLeave" (
    "id" TEXT NOT NULL,
    "volunteerId" TEXT NOT NULL,
    "startsOn" DATE NOT NULL,
    "endsOn" DATE NOT NULL,
    "reason" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VolunteerLeave_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VolunteerLeave_volunteerId_endsOn_idx" ON "VolunteerLeave"("volunteerId", "endsOn");

-- CreateIndex
CREATE INDEX "VolunteerLeave_endsOn_startsOn_idx" ON "VolunteerLeave"("endsOn", "startsOn");

-- AddForeignKey
ALTER TABLE "VolunteerLeave" ADD CONSTRAINT "VolunteerLeave_volunteerId_fkey" FOREIGN KEY ("volunteerId") REFERENCES "VolunteerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VolunteerLeave" ADD CONSTRAINT "VolunteerLeave_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
