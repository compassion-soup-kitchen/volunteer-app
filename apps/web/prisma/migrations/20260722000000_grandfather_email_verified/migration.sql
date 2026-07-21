-- Email verification now gates credentials sign-in. Accounts created before
-- this feature existed never received a verification link, so grandfather
-- them in as verified rather than locking every existing volunteer out.
UPDATE "User" SET "emailVerified" = "createdAt" WHERE "emailVerified" IS NULL;
