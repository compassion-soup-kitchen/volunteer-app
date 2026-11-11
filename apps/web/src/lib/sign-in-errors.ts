/**
 * What to tell someone who lands back on /login after an Apple or Google
 * sign-in was refused.
 *
 * Auth.js reports why with an `?error=` code on the sign-in page (`pages.error`
 * points there too, so its own bare error page is never shown). The codes are
 * Auth.js's, plus `AppleNoEmail` from our own `signIn` callback. Each message
 * says what to do next rather than just that something failed.
 */

const MESSAGES: Record<string, string> = {
  // An account with this email already exists but its address was never
  // confirmed, so we won't attach the new identity to it - see
  // `decideEmailLink`. A verified one is linked instead of landing here.
  OAuthAccountNotLinked:
    "There's already an account with that email address, but it hasn't been confirmed yet. Sign in with your email and password, or use \"Forgot password\" to confirm it.",
  // Our `signIn` callback said no: an archived account, or an address the
  // provider hasn't verified.
  AccessDenied:
    "That account can't sign in. If your email address isn't verified with the provider yet, verify it there first - otherwise get in touch with the team.",
  AppleNoEmail:
    "Apple didn't share your email address, so we can't set up an account. In your Apple ID settings, under Sign in with Apple, remove Compassion and try again - or sign up with your email address.",
};

const FALLBACK =
  "That sign-in didn't go through. Please try again, or sign in with your email and password.";

/**
 * The message for an `?error=` code, or null when there's no error to show.
 *
 * `CredentialsSignin` is deliberately silent: the email/password form reports
 * its own failures inline, and never round-trips through this redirect.
 */
export function signInErrorMessage(
  code: string | string[] | undefined
): string | null {
  const value = Array.isArray(code) ? code[0] : code;
  if (!value || value === "CredentialsSignin") return null;
  return MESSAGES[value] ?? FALLBACK;
}
