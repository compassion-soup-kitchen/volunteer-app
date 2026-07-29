/**
 * Headless component that keeps the app on the latest published JS bundle.
 *
 * `expo-updates` already checks once at launch (`checkAutomatically: ON_LOAD`)
 * and applies what it finds on the *next* launch, which for a volunteer who
 * leaves the app open for days means never. This adds the missing half:
 *
 * - on returning to the foreground, check and download in the background, and
 * - apply a downloaded update only after a long enough absence that reloading
 *   cannot lose anything the volunteer was in the middle of.
 *
 * Nothing here runs unless EAS Update governs the bundle, which rules out
 * development and Expo Go (see `IS_OTA_MANAGED`). Testing OTA needs a release
 * build - `build:ios:preview` or a TestFlight build.
 */

import * as Updates from 'expo-updates';
import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { IS_OTA_MANAGED, isSafeToReloadAfter } from '@/lib/updates';

async function downloadLatest(): Promise<void> {
  try {
    const { isAvailable } = await Updates.checkForUpdateAsync();
    if (isAvailable) await Updates.fetchUpdateAsync();
  } catch {
    // Offline, or the update server is unreachable. The embedded bundle keeps
    // working and we try again on the next resume.
  }
}

export function AppUpdates() {
  const { isUpdatePending } = Updates.useUpdates();

  // Mirrored into a ref so the listener can read the latest value without being
  // torn down and re-registered every time it changes.
  const pending = useRef(isUpdatePending);
  useEffect(() => {
    pending.current = isUpdatePending;
  }, [isUpdatePending]);

  const leftAt = useRef<number | null>(null);

  useEffect(() => {
    if (!IS_OTA_MANAGED) return;

    function onChange(next: AppStateStatus) {
      // Only `background` counts as leaving: iOS reports `inactive` for
      // transient things like an alert or the app switcher preview.
      if (next === 'background') {
        leftAt.current = Date.now();
        return;
      }
      if (next !== 'active' || leftAt.current === null) return;

      const awayMs = Date.now() - leftAt.current;
      leftAt.current = null;

      if (pending.current) {
        // Already holding a downloaded bundle. `checkForUpdateAsync` compares
        // against the *running* update, so it would keep reporting this one as
        // available and re-download it on every resume - a volunteer's mobile
        // data for nothing. Just wait for a long enough absence to apply it.
        if (isSafeToReloadAfter(awayMs)) {
          // Reads as a fresh launch, which is what it effectively is.
          Updates.reloadAsync().catch(() => {});
        }
        return;
      }
      void downloadLatest();
    }

    const subscription = AppState.addEventListener('change', onChange);
    return () => subscription.remove();
  }, []);

  return null;
}
