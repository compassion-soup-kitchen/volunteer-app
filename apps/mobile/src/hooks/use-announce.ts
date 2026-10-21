import { useEffect } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Speak a message through VoiceOver / TalkBack.
 *
 * `accessibilityRole="alert"` and `accessibilityLiveRegion` do nothing on iOS,
 * so anything that appears without focus moving to it - a toast, an inline
 * error under a form - has to be announced explicitly or a VoiceOver user
 * never learns it happened. On iOS the announcement is queued behind whatever
 * is being read, so the "Sign in, button" that triggered it doesn't cut it off.
 */
export function announce(message: string) {
  if (process.env.EXPO_OS === 'ios') {
    AccessibilityInfo.announceForAccessibilityWithOptions(message, { queue: true });
  } else {
    AccessibilityInfo.announceForAccessibility(message);
  }
}

/**
 * Announce `message` whenever it changes to a new non-empty value - for inline
 * errors held in state. Forms clear their error before each attempt, so the
 * same error twice in a row is still announced twice.
 */
export function useAnnounce(message: string | null | undefined) {
  useEffect(() => {
    if (message) announce(message);
  }, [message]);
}
