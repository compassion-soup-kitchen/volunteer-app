import { View } from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { Icon, type IconName } from './icon';
import { type Tone, toneColors } from './tones';

export type IconChipProps = {
  icon: IconName;
  tone?: Tone;
  size?: number;
};

/** A rounded, tinted square holding an icon — used to anchor cards and stats. */
export function IconChip({ icon, tone = 'brand', size = 40 }: IconChipProps) {
  const { colors } = useTheme();
  const { bg, fg } = toneColors(tone, colors);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: Radius.md,
        borderCurve: 'continuous',
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Icon name={icon} size={Math.round(size * 0.5)} raw={fg} />
    </View>
  );
}
