import { type ReactNode } from 'react';
import { View } from 'react-native';

import { Illustration, type IllustrationName } from '@/components/brand';
import { Spacing } from '@/constants/theme';

import { Text } from './text';

export type PageHeaderProps = {
  /** Te Reo eyebrow label, e.g. "Nau mai" */
  overline?: string;
  title: string;
  subtitle?: string;
  /** Trailing element (e.g. an avatar) */
  right?: ReactNode;
  /** Optional brand brushstroke, set faintly behind the title as a watermark */
  illustration?: IllustrationName;
};

/** The large, serif page title used at the top of each tab screen. */
export function PageHeader({ overline, title, subtitle, right, illustration }: PageHeaderProps) {
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md }}>
        {illustration ? (
          <Illustration
            name={illustration}
            height={96}
            color="primary"
            style={{ position: 'absolute', right: -8, top: -20, opacity: 0.16 }}
          />
        ) : null}
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
