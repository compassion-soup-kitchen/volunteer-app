import { Illustration } from '@/components/brand';
import { Card, Text } from '@/components/ui';
import { FontFamily, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * The kaupapa grace note that closes the dashboard: Suzanne Aubert's founding
 * words on a deep ink panel, with a faint brand brushstroke. Moved to the foot
 * of the page so it lands as a closing reflection, never blocking the day's
 * essentials at the top.
 */
export function MissionQuote() {
  const { colors } = useTheme();
  return (
    <Card tone="ink" elevated padding={Spacing.xl} style={{ gap: Spacing.md, overflow: 'hidden' }}>
      <Illustration
        name="heart"
        height={132}
        tint="rgba(228,0,43,0.22)"
        style={{ position: 'absolute', right: -22, bottom: -28 }}
      />
      <Text variant="overline" style={{ color: colors.onInkMuted }}>
        Tō tātou kaupapa
      </Text>
      <Text style={{ fontFamily: FontFamily.serifItalic, fontSize: 19, lineHeight: 27, color: colors.onInk }}>
        &ldquo;Help one another and make use of the many little occasions to lighten the burden of others.&rdquo;
      </Text>
      <Text variant="overline" style={{ color: colors.onInkMuted }}>
        Suzanne Aubert · Meri Hōhepa
      </Text>
    </Card>
  );
}
