import { format, parseISO } from 'date-fns';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { type Tone, toneColors } from '@/components/ui/tones';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** A calendar-style date chip: weekday over day-of-month, tinted by tone. */
export function DateBlock({ date, tone = 'neutral', size = 54 }: { date: string; tone?: Tone; size?: number }) {
  const { colors } = useTheme();
  const { bg, fg } = toneColors(tone, colors);
  const d = parseISO(date);

  return (
    <View
      style={{
        width: size,
        borderRadius: Radius.md,
        borderCurve: 'continuous',
        backgroundColor: bg,
        paddingVertical: Spacing.sm,
        alignItems: 'center',
        gap: 1,
      }}>
      <Text variant="overline" style={{ color: fg }}>
        {format(d, 'EEE')}
      </Text>
      <Text variant="heading" style={{ color: fg }}>
        {format(d, 'd')}
      </Text>
    </View>
  );
}
