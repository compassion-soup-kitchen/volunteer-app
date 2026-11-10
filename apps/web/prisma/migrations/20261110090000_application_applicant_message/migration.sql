-- `notes` was labelled internal to staff but was also shown to the applicant.
-- It is now staff-only, and this column holds what the applicant should read.
-- Deliberately not backfilled from `notes`: those were written as private.
ALTER TABLE "Application" ADD COLUMN "applicantMessage" TEXT;
