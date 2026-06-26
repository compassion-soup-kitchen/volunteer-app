import { View } from 'react-native';

import { Spacing } from '@/constants/theme';

import { IconChip } from './icon-chip';
import { type IconName } from './icon';
import { Text } from './text';
import { type Tone } from './tones';

export type StatProps = {
  value: string;
  label: string;
  caption?: string;
  captionTone?: 'success' | 'muted';
  icon?: IconName;
  tone?: Tone;
};

/** A single headline metric: optional icon chip, big tabular value, label. */
export function Stat({ value, label, caption, captionTone = 'muted', icon, tone = 'brand' }: StatProps) {
  return (
    <View style={{ gap: Spacing.sm }}>
      {icon ? <IconChip icon={icon} tone={tone} size={36} /> : null}
      <View style={{ gap: 2 }}>
        <Text variant="stat">{value}</Text>
        <Text variant="caption" color="textSecondary">
          {label}
        </Text>
        {caption ? (
          <Text variant="caption" color={captionTone === 'success' ? 'success' : 'textTertiary'}>
            {caption}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
