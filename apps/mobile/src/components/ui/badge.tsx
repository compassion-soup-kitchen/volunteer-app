import { View } from 'react-native';

import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { Icon, type IconName } from './icon';
import { Text } from './text';
import { type Tone, toneColors } from './tones';

export type BadgeTone = Tone;

export type BadgeProps = {
  label: string;
  tone?: BadgeTone;
  icon?: IconName;
  /** A bolder, solid-filled variant for the single most important status on a card */
  solid?: boolean;
};

/** Status pill. Always pairs colour with text (and optionally an icon). */
export function Badge({ label, tone = 'neutral', icon, solid = false }: BadgeProps) {
  const { colors } = useTheme();
  const tint = toneColors(tone, colors);
  const bg = solid ? tint.fg : tint.bg;
  const fg = solid ? colors.surface : tint.fg;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        alignSelf: 'flex-start',
        backgroundColor: bg,
        paddingHorizontal: 11,
        paddingVertical: 4,
        borderRadius: Radius.pill,
      }}>
      {icon ? <Icon name={icon} size={13} raw={fg} /> : null}
      <Text
        variant="caption"
        style={{ color: fg, fontFamily: FontFamily.textBold, letterSpacing: 0.1 }}>
        {label}
      </Text>
    </View>
  );
}
