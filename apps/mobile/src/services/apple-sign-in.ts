/**
 * Sign in with Apple.
 *
 * Required by App Store guideline 4.8: an app offering a third-party login
 * service (ours is Google) has to offer an equivalent that limits collection to
 * name and email, lets people keep their address private, and doesn't track
 * them for ads. Sign in with Apple is that option.
 *
 * `expo-apple-authentication` ships native code, so - like the Google module -
 * it exists only in a development or production build, never in Expo Go. It is
 * therefore imported lazily, on the first tap, and a failure to load degrades
 * to "not available in this build" instead of taking the whole app down at
 * launch.
 *
 * All this layer produces is Apple's identity token (plus the two things Apple
 * only ever hands the *client*); proving who it belongs to is the server's job
 * (`POST /api/v1/auth/apple`).
 */

/** iOS-only: Apple's sheet has no Android or web implementation. */
export const APPLE_SIGN_IN_PLATFORM = process.env.EXPO_OS === 'ios';

export type AppleSignInOutcome =
  | {
      type: 'success';
      identityToken: string;
      /** Exchanged server-side for the token that lets us revoke on deletion. */
      authorizationCode: string | null;
      /**
       * Apple returns the name on the *first* authorisation only, and never
       * again - not even after a reinstall. Null every time after that, which
       * is why the server uses it to label new accounts and nothing else.
       */
      fullName: string | null;
    }
  /** The person backed out of Apple's sheet - not an error to shout about. */
  | { type: 'cancelled' }
  | { type: 'error'; message: string };

const UNAVAILABLE =
  'Apple sign-in needs the full app, not Expo Go. Please sign in with your email and password.';

type AppleModule = typeof import('expo-apple-authentication');

let modulePromise: Promise<AppleModule | null> | null = null;

function loadApple(): Promise<AppleModule | null> {
  modulePromise ??= import('expo-apple-authentication').catch(() => null);
  return modulePromise;
}

/**
 * Whether this device can offer the button at all. False on iOS versions below
 * 13 and on any simulator without an Apple ID signed in, so the button is
 * hidden rather than offered as something that could only fail.
 */
export async function isAppleSignInAvailable(): Promise<boolean> {
  if (!APPLE_SIGN_IN_PLATFORM) return false;
  const apple = await loadApple();
  if (!apple) return false;
  try {
    return await apple.isAvailableAsync();
  } catch {
    return false;
  }
}

/** Joins the name parts Apple gives us into something we'd put on a profile. */
function joinName(fullName: {
  givenName: string | null;
  familyName: string | null;
} | null): string | null {
  if (!fullName) return null;
  const parts = [fullName.givenName, fullName.familyName]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));
  return parts.length ? parts.join(' ') : null;
}

/** Runs Apple's sign-in sheet and returns the identity token it issues. */
export async function signInWithApple(): Promise<AppleSignInOutcome> {
  if (!APPLE_SIGN_IN_PLATFORM) return { type: 'error', message: UNAVAILABLE };

  const apple = await loadApple();
  if (!apple) return { type: 'error', message: UNAVAILABLE };

  try {
    const credential = await apple.signInAsync({
      // Exactly what guideline 4.8 permits us to ask for, and no more. EMAIL
      // may still come back as a private relay address, which is the point.
      requestedScopes: [
        apple.AppleAuthenticationScope.FULL_NAME,
        apple.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      return {
        type: 'error',
        message: "Apple didn't return a sign-in token. Please try email and password instead.",
      };
    }

    return {
      type: 'success',
      identityToken: credential.identityToken,
      authorizationCode: credential.authorizationCode ?? null,
      fullName: joinName(credential.fullName),
    };
  } catch (error) {
    if ((error as { code?: string })?.code === 'ERR_REQUEST_CANCELED') {
      return { type: 'cancelled' };
    }
    return { type: 'error', message: "We couldn't reach Apple just then. Please try again." };
  }
}
