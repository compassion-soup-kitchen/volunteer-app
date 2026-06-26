import * as Haptics from 'expo-haptics';
import { type ReactNode } from 'react';
import { Pressable, type StyleProp, View, type ViewStyle } from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { type Tone, toneColors } from './tones';

export type CardProps = {
  children: ReactNode;
  onPress?: () => void;
  padding?: number;
  /** Use a quieter, recessed surface fill (for nested blocks) */
  muted?: boolean;
  /** Hero / feature card: a slightly larger radius */
  elevated?: boolean;
  /** Tinted callout card in a semantic tone (brand/navy/accent/success…) */
  tone?: Tone;
  radius?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

/**
 * The app's surface primitive — an open, editorial container. The neutral
 * surface is transparent so content sits directly on the page (no fill, border,
 * shadow or padding); `tone` and `muted` still paint a fill for deliberate
 * callouts. Tappable cards get a soft press highlight.
 */
export function Card({
  children,
  onPress,
  padding = 0,
  muted,
  elevated,
  tone,
  radius,
  style,
  accessibilityLabel,
}: CardProps) {
  const { colors } = useTheme();
  const tint = tone ? toneColors(tone, colors) : null;

  const backgroundColor = tint ? tint.bg : muted ? colors.surfaceMuted : 'transparent';

  const base: ViewStyle = {
    backgroundColor,
    borderRadius: radius ?? (elevated ? Radius.xl : Radius.lg),
    borderCurve: 'continuous',
    padding,
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
        // Filled callouts darken slightly; open cards just dim — no heavy box.
        pressed && (tint ? { opacity: 0.92 } : { opacity: 0.55 }),
        pressed && { transform: [{ scale: 0.98 }] },
        style,
      ]}>
      {children}
    </Pressable>
  );
}
