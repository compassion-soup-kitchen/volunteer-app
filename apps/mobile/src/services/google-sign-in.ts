/**
 * Native Google sign-in.
 *
 * `@react-native-google-signin/google-signin` ships native code, so it exists
 * only in a development or production build - never in Expo Go. The module is
 * therefore imported lazily, on the first tap, and a failure to load degrades
 * to "not available in this build" instead of taking the whole app down at
 * launch.
 *
 * All this layer produces is Google's ID token; proving who it belongs to is
 * the server's job (`POST /api/v1/auth/google`).
 */

// Inlined by Metro at build time, so these must be written out in full.
const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() || null;
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() || null;

/**
 * Whether this build has Google credentials at all. iOS needs the iOS client;
 * Android gets its own client from the signing certificate and needs the web
 * ("server") client so Google returns an ID token our API can verify.
 */
export const GOOGLE_SIGN_IN_CONFIGURED = Boolean(
  process.env.EXPO_OS === 'ios' ? IOS_CLIENT_ID : WEB_CLIENT_ID,
);

export type GoogleSignInOutcome =
  | { type: 'success'; idToken: string }
  /** The person backed out of Google's sheet - not an error to shout about. */
  | { type: 'cancelled' }
  | { type: 'error'; message: string };

const UNAVAILABLE =
  'Google sign-in needs the full app, not Expo Go. Please sign in with your email and password.';

type GoogleModule = typeof import('@react-native-google-signin/google-signin');

let modulePromise: Promise<GoogleModule | null> | null = null;

/** Loads and configures the native module once, or resolves null if it isn't there. */
function loadGoogle(): Promise<GoogleModule | null> {
  modulePromise ??= import('@react-native-google-signin/google-signin')
    .then((mod) => {
      mod.GoogleSignin.configure({
        ...(IOS_CLIENT_ID ? { iosClientId: IOS_CLIENT_ID } : {}),
        ...(WEB_CLIENT_ID ? { webClientId: WEB_CLIENT_ID } : {}),
      });
      return mod;
    })
    .catch(() => null);
  return modulePromise;
}

/** Runs Google's sign-in sheet and returns the ID token it issues. */
export async function signInWithGoogle(): Promise<GoogleSignInOutcome> {
  if (!GOOGLE_SIGN_IN_CONFIGURED) return { type: 'error', message: UNAVAILABLE };

  const google = await loadGoogle();
  if (!google) return { type: 'error', message: UNAVAILABLE };

  try {
    // Resolves immediately on iOS; on Android it offers the Play Services
    // update the sheet can't open without.
    await google.GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    const response = await google.GoogleSignin.signIn();
    if (!google.isSuccessResponse(response)) return { type: 'cancelled' };

    const idToken = response.data.idToken;
    if (!idToken) {
      // Almost always a configuration gap: no web client id on Android, so
      // Google hands back a profile but no token to verify it with.
      return {
        type: 'error',
        message: "Google didn't return a sign-in token. Please try email and password instead.",
      };
    }

    return { type: 'success', idToken };
  } catch (error) {
    if (google.isErrorWithCode(error)) {
      const { statusCodes } = google;
      // IN_PROGRESS means the sheet is already up from an earlier tap - the
      // person is mid-flow, so this attempt has nothing to say.
      if (
        error.code === statusCodes.SIGN_IN_CANCELLED ||
        error.code === statusCodes.IN_PROGRESS
      ) {
        return { type: 'cancelled' };
      }
      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        return {
          type: 'error',
          message:
            'Google Play Services needs updating on this device before you can use Google sign-in.',
        };
      }
    }
    return { type: 'error', message: "We couldn't reach Google just then. Please try again." };
  }
}

/**
 * Clears the device's Google session on sign-out, so the next person to use
 * the app is asked to pick an account rather than dropped into the last one.
 */
export async function signOutFromGoogle(): Promise<void> {
  // No `modulePromise` means nobody has signed in with Google this launch,
  // so there's nothing native to clear and no reason to load the module.
  if (!GOOGLE_SIGN_IN_CONFIGURED || !modulePromise) return;
  const google = await loadGoogle();
  await google?.GoogleSignin.signOut().catch(() => {
    // Never let a stale Google session block our own sign-out.
  });
}
