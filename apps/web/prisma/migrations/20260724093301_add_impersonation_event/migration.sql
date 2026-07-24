-- CreateTable
CREATE TABLE "ImpersonationEvent" (
    "id" TEXT NOT NULL,
    "impersonatorId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "ImpersonationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImpersonationEvent_impersonatorId_idx" ON "ImpersonationEvent"("impersonatorId");

-- CreateIndex
CREATE INDEX "ImpersonationEvent_targetUserId_idx" ON "ImpersonationEvent"("targetUserId");

-- AddForeignKey
ALTER TABLE "ImpersonationEvent" ADD CONSTRAINT "ImpersonationEvent_impersonatorId_fkey" FOREIGN KEY ("impersonatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImpersonationEvent" ADD CONSTRAINT "ImpersonationEvent_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
