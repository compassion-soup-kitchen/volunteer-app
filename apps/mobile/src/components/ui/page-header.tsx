import { type ReactNode } from 'react';
import { View } from 'react-native';

import { Spacing } from '@/constants/theme';

import { Text } from './text';

export type PageHeaderProps = {
  /** Te Reo eyebrow label, e.g. "Nau mai" */
  overline?: string;
  title: string;
  subtitle?: string;
  /** Trailing element (e.g. an avatar) */
  right?: ReactNode;
};

/** The large, serif page title used at the top of each tab screen. */
export function PageHeader({ overline, title, subtitle, right }: PageHeaderProps) {
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md }}>
        <View style={{ flex: 1, gap: 4 }}>
          {overline ? (
            <Text variant="overline" color="primary">
              {overline}
            </Text>
          ) : null}
          <Text variant="display">{title}</Text>
        </View>
        {right}
      </View>
      {subtitle ? (
        <Text variant="body" color="textSecondary">
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
