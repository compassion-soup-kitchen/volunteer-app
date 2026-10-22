-- Lets a password change, a password reset or archiving sign out every
-- existing session. Tokens minted before this carry no version and read as 0,
-- so nobody is signed out by the deploy itself.

-- AlterTable
ALTER TABLE "User" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;
