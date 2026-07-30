/**
 * Shared state and helpers for the over-the-air update flow (see
 * `components/app-updates` and `components/app-version`).
 *
 * Applying an update means reloading the JS bundle, which throws away whatever
 * the volunteer had on screen - a half-filled application, a shift they were
 * about to confirm. So a downloaded update waits until we can be confident the
 * app was put down rather than merely glanced away from.
 */

import { format } from 'date-fns';
import * as Updates from 'expo-updates';

/**
 * Whether EAS Update actually governs this bundle.
 *
 * `Updates.isEnabled` alone is not the answer: it is true in Expo Go and in a
 * development build, both of which serve the bundle from Metro and then report
 * it as a non-embedded "update" with a `createdAt` - which would have the
 * version line claiming an update that never happened. A channel is only baked
 * in by an EAS build, and `__DEV__` rules out a dev build talking to Metro.
 */
export const IS_OTA_MANAGED = Updates.isEnabled && !__DEV__ && Boolean(Updates.channel);

/**
 * How long the app must have been in the background before a pending update is
 * allowed to reload it on return. Fifteen minutes is well past "I checked a
 * text mid-signup" and comfortably short of "I'll open this again tomorrow".
 */
export const RESUME_RELOAD_AFTER_MS = 15 * 60 * 1000;

/**
 * Whether an absence of `awayMs` was long enough to read as a new session
 * rather than a glance away.
 *
 * Not sufficient on its own: a phone call is easily this long, and it can just
 * as well arrive mid-form. Pair it with `isReadOnlySurface`.
 */
export function isSafeToReloadAfter(awayMs: number): boolean {
  return awayMs >= RESUME_RELOAD_AFTER_MS;
}

/**
 * Whether the focused route is a screen with nothing to lose - one of the
 * read-only tab screens (dashboard, shifts, hours, training, profile).
 *
 * An allowlist of safe surfaces rather than a blocklist of form routes, so the
 * failure mode is the harmless one. Every form in the app is a pushed route or
 * a modal outside the tab group (`apply`, `profile/edit`, `(auth)/register`,
 * `(auth)/login`) and none of them persist a draft, so any form added later is
 * excluded by default. Getting this wrong delays an update; getting it wrong the
 * other way loses someone's half-finished application.
 */
export function isReadOnlySurface(segments: readonly string[]): boolean {
  return segments[0] === '(tabs)';
}

/**
 * The version line shown on the profile screen: `Version 1.0.0` for the code
 * that shipped in the build, plus the update's publish date once one is running.
 * Support conversations start with "which version are you on?", and with
 * `appVersionSource: remote` the build number alone would not answer it.
 *
 * `otaManaged` is `IS_OTA_MANAGED`, taken as an argument rather than read from
 * module state so this stays pure.
 */
export function versionLabel(
  version: string | undefined,
  update: { isEmbeddedLaunch: boolean; createdAt?: Date | null },
  otaManaged: boolean,
): string {
  const base = `Version ${version ?? '—'}`;
  if (!otaManaged || update.isEmbeddedLaunch || !update.createdAt) return base;
  return `${base} · updated ${format(update.createdAt, 'd MMM')}`;
}
