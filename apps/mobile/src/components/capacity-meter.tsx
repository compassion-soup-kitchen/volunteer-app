import { View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

/** How many spots remain on a shift, and the urgency that implies. */
export function availability(taken: number, capacity: number): {
  left: number;
  full: boolean;
  /** One or two spots remain — the "grab it now" zone. */
  scarce: boolean;
} {
  const left = Math.max(0, capacity - taken);
  return { left, full: left <= 0, scarce: left > 0 && left <= 2 };
}

/** The short status string shown beside the meter, e.g. "2 spots left". */
export function spotsLabel(taken: number, capacity: number): string {
  const { left, full } = availability(taken, capacity);
  if (full) return 'Shift full';
  return `${left} ${left === 1 ? 'spot' : 'spots'} left`;
}

export type CapacityMeterProps = {
  /** Volunteers already signed up. */
  taken: number;
  capacity: number;
  /** Diameter of each seat dot. */
  size?: number;
  /** Cap the dot count for very large shifts (keeps the strip tidy). */
  max?: number;
};

/**
 * A row of seat dots — one per spot on the shift. Filled taupe = taken, pale =
 * open. When only a spot or two remain, the open seats glow brand red to signal
 * scarcity. Honest (a fuller shift shows more filled seats) and legible at a
 * glance; the adjacent `spotsLabel` carries the meaning for screen readers and
 * never relies on colour alone.
 */
export function CapacityMeter({ taken, capacity, size = 8, max = 8 }: CapacityMeterProps) {
  const { colors } = useTheme();
  const { full, scarce } = availability(taken, capacity);

  // Scale down to `max` dots for big shifts while preserving the taken/open ratio.
  const total = Math.min(capacity, max);
  const filled = capacity > 0 ? Math.round((taken / capacity) * total) : 0;
  const takenDots = Math.min(total, Math.max(full ? total : 0, filled));

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      {Array.from({ length: total }).map((_, i) => {
        const isTaken = i < takenDots;
        const color = isTaken
          ? colors.textTertiary
          : scarce
            ? colors.primary
            : colors.surfaceMuted;
        return (
          <View key={i} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
        );
      })}
    </View>
  );
}
