import { View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { Icon, type IconName } from './icon';
import { Text } from './text';
import { type Tone, toneColors } from './tones';

export type BadgeTone = Tone;

export type BadgeProps = {
  label: string;
  tone?: BadgeTone;
  icon?: IconName;
};

/** Status pill. Always pairs colour with text (and optionally an icon). */
export function Badge({ label, tone = 'neutral', icon }: BadgeProps) {
  const { colors } = useTheme();
  const { bg, fg } = toneColors(tone, colors);
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        alignSelf: 'flex-start',
        backgroundColor: bg,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 3,
        borderRadius: Radius.pill,
      }}>
      {icon ? <Icon name={icon} size={13} raw={fg} /> : null}
      <Text variant="caption" style={{ color: fg, fontWeight: '700' }}>
        {label}
      </Text>
    </View>
  );
}
