/**
 * The version line in the profile footer, and the one place a volunteer can ask
 * for an update by hand - useful when support has just published a fix and does
 * not want to wait for the automatic resume check in `app-updates`.
 *
 * Tapping is only offered where updates actually work; in development and Expo
 * Go the line is inert text.
 */

import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { Alert, Pressable } from 'react-native';

import { Text } from '@/components/ui';
import { IS_OTA_MANAGED, versionLabel } from '@/lib/updates';
import { useToast } from '@/providers/toast-provider';

export function AppVersion() {
  const { currentlyRunning, isChecking, isDownloading } = Updates.useUpdates();
  const toast = useToast();

  const busy = isChecking || isDownloading;
  const label = busy
    ? 'Checking for updates…'
    : versionLabel(Constants.expoConfig?.version, currentlyRunning, IS_OTA_MANAGED);

  const line = (
    <Text variant="caption" color="textTertiary" center>
      {label}
    </Text>
  );

  if (!IS_OTA_MANAGED) return line;

  async function check() {
    try {
      const { isAvailable } = await Updates.checkForUpdateAsync();
      if (!isAvailable) {
        toast.show('You are on the latest version');
        return;
      }
      toast.show('Fetching the latest version…');
      await Updates.fetchUpdateAsync();
      // Restarting is the volunteer's call, not ours: asking for an update from
      // the profile screen says nothing about what is open elsewhere in the app.
      // Declining costs nothing - `app-updates` applies it after a long absence.
      Alert.alert('Update ready', 'Restart the app to finish updating?', [
        { text: 'Later', style: 'cancel' },
        {
          text: 'Restart',
          onPress: () => {
            Updates.reloadAsync().catch(() => {});
          },
        },
      ]);
    } catch {
      toast.error('Could not check for updates just now');
    }
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Check for updates"
      disabled={busy}
      onPress={check}
      style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
      {line}
    </Pressable>
  );
}
