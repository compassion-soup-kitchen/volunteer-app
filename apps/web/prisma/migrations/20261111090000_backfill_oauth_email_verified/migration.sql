-- Auth.js creates OAuth users with "emailVerified" left NULL whatever the
-- provider says, and until the `createUser` event (#199) nothing filled it in.
-- So everyone who signed up with Google on the website since email
-- verification arrived (the grandfather migration covered those before) is
-- recorded as unverified, although Google proved the address before we let
-- them in (`isOAuthSignInAllowed`).
--
-- That now matters: a second sign-in method is only linked onto an account
-- whose address is verified (`decideEmailLink`), so without this, someone who
-- signed up with Google is refused when they try Sign in with Apple.
--
-- Every Google or Apple `Account` row was created with the address the
-- provider verified (linking onto an unverified account was always refused),
-- and nothing lets a signed-in person change their email, so these addresses
-- are proved. Offline volunteers never have one, but are excluded regardless.
UPDATE "User" u
SET "emailVerified" = u."createdAt"
WHERE u."emailVerified" IS NULL
  AND u."isOffline" = false
  AND EXISTS (
    SELECT 1 FROM "Account" a
    WHERE a."userId" = u."id" AND a."provider" IN ('google', 'apple')
  );
