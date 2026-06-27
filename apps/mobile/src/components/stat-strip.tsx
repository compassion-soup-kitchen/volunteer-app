import { View } from 'react-native';

import { Card, Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type StatStripItem = { value: string; label: string };

/**
 * A dark "ink" strip of headline figures — serif numerals over tiny uppercase
 * labels, split by hairline dividers. The mission-forward dashboard summary.
 */
export function StatStrip({ items }: { items: StatStripItem[] }) {
  const { colors } = useTheme();
  return (
    <Card tone="ink" radius={Radius.lg} padding={Spacing.lg} style={{ flexDirection: 'row' }}>
      {items.map((item, i) => (
        <View
          key={item.label}
          style={{
            flex: 1,
            alignItems: 'center',
            gap: 3,
            borderLeftWidth: i > 0 ? 1 : 0,
            borderLeftColor: 'rgba(255,255,255,0.14)',
          }}>
          <Text variant="stat" style={{ color: colors.onInk }}>
            {item.value}
          </Text>
          <Text
            variant="overline"
            style={{ color: colors.onInkMuted, fontSize: 9, letterSpacing: 1 }}>
            {item.label}
          </Text>
        </View>
      ))}
    </Card>
  );
}
