import { Pressable, View } from 'react-native';

import { Spacing } from '@/constants/theme';

import { Divider } from './divider';
import { Icon } from './icon';
import { Text } from './text';

export type SectionHeaderProps = {
  /** Te Reo eyebrow label, e.g. "Tō rōhita" */
  overline?: string;
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Draw a hairline rule above the title, to separate stacked sections */
  divider?: boolean;
};

/** A section title with an optional Te Reo eyebrow and a trailing text action. */
export function SectionHeader({ overline, title, actionLabel, onAction, divider }: SectionHeaderProps) {
  const row = (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: Spacing.md }}>
      <View style={{ flex: 1, gap: 2 }}>
        {overline ? (
          <Text variant="overline" color="primary">
            {overline}
          </Text>
        ) : null}
        <Text variant="title">{title}</Text>
      </View>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          hitSlop={8}
          style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 1, opacity: pressed ? 0.55 : 1 }]}>
          <Text variant="label" color="accent">
            {actionLabel}
          </Text>
          <Icon name="chevron-forward" size={16} color="accent" />
        </Pressable>
      ) : null}
    </View>
  );

  if (!divider) return row;

  return (
    <View style={{ gap: Spacing.lg }}>
      <Divider />
      {row}
    </View>
  );
}
