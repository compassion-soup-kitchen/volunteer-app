import { Pressable } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { Text } from './text';

export type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
};

/** Selectable filter chip (e.g. service-area filters). */
export function Chip({ label, selected = false, onPress }: ChipProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      // 38pt drawn, 44pt to the touch.
      hitSlop={{ top: 3, bottom: 3 }}
      style={({ pressed }) => [
        {
          // A floor, not a fixed height, so larger Dynamic Type sizes aren't clipped.
          minHeight: 38,
          paddingHorizontal: Spacing.lg,
          paddingVertical: Spacing.sm,
          borderRadius: Radius.pill,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          backgroundColor: selected ? colors.primary : colors.surface,
          borderColor: selected ? colors.primary : colors.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}>
      <Text variant="label" style={{ color: selected ? colors.primaryForeground : colors.textSecondary }}>
        {label}
      </Text>
    </Pressable>
  );
}
