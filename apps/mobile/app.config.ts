import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Dynamic layer over the static `app.json`.
 *
 * Google sign-in needs the iOS OAuth client registered as a URL scheme at
 * build time, and that client id belongs to whichever Google Cloud project the
 * build is for - so it comes from the environment rather than being committed.
 * With `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` unset the plugin is left out
 * entirely: the app still builds and runs, just without Google sign-in (the
 * sign-in screen hides the button to match).
 */

/**
 * Google's iOS clients redirect to their own id, reversed:
 * `123-abc.apps.googleusercontent.com` -> `com.googleusercontent.apps.123-abc`.
 * Deriving it here means one env var to set and no chance of the scheme and
 * the client id drifting apart.
 */
function reversedClientId(clientId: string): string {
  return clientId.split('.').reverse().join('.');
}

// The return type is left to inference: everything but `plugins` passes
// through from app.json untouched, and annotating it `ExpoConfig` would force
// invented fallbacks for the `name`/`slug` already set there.
export default ({ config }: ConfigContext) => {
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();

  const plugins: NonNullable<ExpoConfig['plugins']> = [...(config.plugins ?? [])];
  if (iosClientId) {
    plugins.push([
      '@react-native-google-signin/google-signin',
      { iosUrlScheme: reversedClientId(iosClientId) },
    ]);
  }

  return { ...config, plugins };
};
