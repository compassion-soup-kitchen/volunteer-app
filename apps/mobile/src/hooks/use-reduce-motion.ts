import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Whether the system "Reduce Motion" setting is on, kept live as it changes.
 *
 * `null` until the first read resolves, so callers can hold off starting motion
 * rather than starting it and stopping it a frame later. Reanimated's
 * `useReducedMotion` reads the setting once at launch and never updates.
 */
export function useReduceMotion(): boolean | null {
  const [reduced, setReduced] = useState<boolean | null>(null);

  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (live) setReduced(value);
      })
      .catch(() => {
        if (live) setReduced(false);
      });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      live = false;
      sub.remove();
    };
  }, []);

  return reduced;
}
