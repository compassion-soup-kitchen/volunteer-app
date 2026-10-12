-- Agreements become staff-managed records rather than four hardcoded enum values.
--
-- `agreementType` moves from the `AgreementType` enum to plain text so staff can
-- add a policy without a schema change. Existing rows keep their exact values
-- (CODE_OF_CONDUCT, SAFEGUARDING, ...), so every signature already on file still
-- lines up with its template.

-- AlterTable: SignedAgreement
ALTER TABLE "SignedAgreement"
  ALTER COLUMN "agreementType" TYPE TEXT USING "agreementType"::TEXT;

-- A tick-box-only agreement has no drawn signature to store.
ALTER TABLE "SignedAgreement"
  ALTER COLUMN "signatureData" DROP NOT NULL;

-- AlterTable: AgreementTemplate
ALTER TABLE "AgreementTemplate"
  ALTER COLUMN "agreementType" TYPE TEXT USING "agreementType"::TEXT;

ALTER TABLE "AgreementTemplate"
  ADD COLUMN "requiresSignature" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "archivedAt" TIMESTAMP(3),
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- DropEnum: nothing references it now.
DROP TYPE "AgreementType";
