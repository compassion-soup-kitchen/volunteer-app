-- CreateEnum
CREATE TYPE "ShiftOfferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- AlterTable
ALTER TABLE "Shift" ADD COLUMN     "offersCloseOn" DATE;

-- CreateTable
CREATE TABLE "ShiftOffer" (
    "id" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "volunteerId" TEXT NOT NULL,
    "status" "ShiftOfferStatus" NOT NULL DEFAULT 'PENDING',
    "offeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "ShiftOffer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShiftOffer_volunteerId_status_idx" ON "ShiftOffer"("volunteerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ShiftOffer_shiftId_volunteerId_key" ON "ShiftOffer"("shiftId", "volunteerId");

-- AddForeignKey
ALTER TABLE "ShiftOffer" ADD CONSTRAINT "ShiftOffer_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftOffer" ADD CONSTRAINT "ShiftOffer_volunteerId_fkey" FOREIGN KEY ("volunteerId") REFERENCES "VolunteerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
