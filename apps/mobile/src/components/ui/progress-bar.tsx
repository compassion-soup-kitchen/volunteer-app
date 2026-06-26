import { View } from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ProgressBarProps = {
  /** 0..1 */
  value: number;
  height?: number;
  /** Theme colour token for the fill (defaults to brand primary) */
  tint?: 'primary' | 'success' | 'navy';
};

export function ProgressBar({ value, height = 8, tint = 'primary' }: ProgressBarProps) {
  const { colors } = useTheme();
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}
      style={{ height, borderRadius: Radius.pill, backgroundColor: colors.surfaceMuted, overflow: 'hidden' }}>
      <View style={{ width: `${pct * 100}%`, height: '100%', borderRadius: Radius.pill, backgroundColor: colors[tint] }} />
    </View>
  );
}
