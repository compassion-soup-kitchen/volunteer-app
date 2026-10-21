import { type ReactNode } from 'react';
import { View } from 'react-native';

import { Card, Text } from '@/components/ui';
import { FontFamily, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type InkHeroProps = {
  /** Te Reo-led eyebrow, e.g. "Tō wā · Time given" */
  overline: string;
  /** Trailing element on the overline row (a momentum pill, say) */
  aside?: ReactNode;
  children: ReactNode;
  gap?: number;
};

/**
 * The dark "ink" feature card that anchors a tab: a soft brand glow off the
 * top-right corner, a muted overline, then whatever the screen leads with -
 * usually a HeroFigure. Shared by the Impact and Training heroes so the two
 * read as one family.
 */
export function InkHero({ overline, aside, children, gap = Spacing.md }: InkHeroProps) {
  const { colors } = useTheme();
  return (
    <Card tone="ink" elevated padding={Spacing.xl} style={{ overflow: 'hidden', gap }}>
      <View
        style={{
          position: 'absolute',
          right: -32,
          top: -32,
          width: 136,
          height: 136,
          borderRadius: 68,
          backgroundColor: colors.primaryGlow,
        }}
      />
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.md }}>
        <Text variant="overline" style={{ flex: 1, color: colors.onInkMuted, letterSpacing: 1.4 }}>
          {overline}
        </Text>
        {aside}
      </View>
      {children}
    </Card>
  );
}

/** The big serif figure on an ink hero, with a smaller muted unit after it ("12 hrs", "2 / 3"). */
export function HeroFigure({ value, unit }: { value: string | number; unit?: string }) {
  const { colors } = useTheme();
  return (
    <Text
      style={{
        fontFamily: FontFamily.serif,
        fontSize: 50,
        lineHeight: 54,
        letterSpacing: -0.6,
        fontVariant: ['tabular-nums'],
        color: colors.onInk,
      }}>
      {value}
      {unit ? (
        <Text style={{ fontFamily: FontFamily.serif, fontSize: 23, letterSpacing: -0.2, color: colors.onInkMuted }}>
          {` ${unit}`}
        </Text>
      ) : null}
    </Text>
  );
}
