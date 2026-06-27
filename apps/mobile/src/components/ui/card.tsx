import * as Haptics from 'expo-haptics';
import { type ReactNode } from 'react';
import { Pressable, type StyleProp, View, type ViewStyle } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { type Tone, toneColors } from './tones';

export type CardProps = {
  children: ReactNode;
  onPress?: () => void;
  padding?: number;
  /** Use a quieter, recessed surface fill (for nested blocks) — no border */
  muted?: boolean;
  /** Hero / feature card: a slightly larger radius */
  elevated?: boolean;
  /** Tinted callout card in a semantic tone (brand/navy/accent/success…) */
  tone?: Tone;
  /** Strip the fill, border and padding — an open, transparent grouping */
  plain?: boolean;
  radius?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

/**
 * The app's surface primitive — a clean white card on the cream canvas, ringed
 * by a warm hairline border (the editorial design's signature container). Use
 * `muted` for a recessed fill, `tone` for a tinted callout, or `plain` for an
 * open transparent grouping with no chrome. Tappable cards get a soft press
 * highlight.
 */
export function Card({
  children,
  onPress,
  padding,
  muted,
  elevated,
  tone,
  plain,
  radius,
  style,
  accessibilityLabel,
}: CardProps) {
  const { colors } = useTheme();
  const tint = tone ? toneColors(tone, colors) : null;

  const backgroundColor = plain
    ? 'transparent'
    : tint
      ? tint.bg
      : muted
        ? colors.surfaceMuted
        : colors.surface;

  // Only the plain white surface carries the hairline ring; fills and tints don't.
  const bordered = !plain && !tint && !muted;
  const pad = padding ?? (plain ? 0 : Spacing.lg);

  const base: ViewStyle = {
    backgroundColor,
    borderRadius: radius ?? (elevated ? Radius.xl : Radius.lg),
    borderCurve: 'continuous',
    borderWidth: bordered ? 1 : 0,
    borderColor: bordered ? colors.border : undefined,
    padding: pad,
  };

  if (!onPress) {
    return <View style={[base, style]}>{children}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      onPressIn={() => {
        if (process.env.EXPO_OS === 'ios') Haptics.selectionAsync();
      }}
      style={({ pressed }) => [
        base,
        // Filled callouts darken slightly; open cards just dim.
        pressed && (plain ? { opacity: 0.55 } : { opacity: 0.92 }),
        pressed && { transform: [{ scale: 0.985 }] },
        style,
      ]}>
      {children}
    </Pressable>
  );
}
