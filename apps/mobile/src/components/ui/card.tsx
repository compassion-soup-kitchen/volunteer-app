import * as Haptics from 'expo-haptics';
import { type ReactNode } from 'react';
import { Pressable, type StyleProp, View, type ViewStyle } from 'react-native';

import { Radius, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { type Tone, toneColors } from './tones';

export type CardProps = {
  children: ReactNode;
  onPress?: () => void;
  padding?: number;
  /** Use a quieter, recessed surface (for nested blocks) */
  muted?: boolean;
  /** Hero / feature card: larger radius and a softer lifted shadow */
  elevated?: boolean;
  /** Tinted callout card in a semantic tone (brand/navy/accent/success…) */
  tone?: Tone;
  radius?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

/**
 * The app's surface primitive: a rounded, gently elevated card that floats on
 * the warm paper canvas. Pass `onPress` to make it an accessible,
 * press-responsive tappable surface; `elevated` for hero cards; `tone` for a
 * tinted callout.
 */
export function Card({
  children,
  onPress,
  padding = Spacing.lg,
  muted,
  elevated,
  tone,
  radius,
  style,
  accessibilityLabel,
}: CardProps) {
  const { colors, isDark } = useTheme();
  const tint = tone ? toneColors(tone, colors) : null;

  const backgroundColor = tint ? tint.bg : muted ? colors.surfaceMuted : colors.surface;
  const borderColor = tint ? 'transparent' : colors.border;
  const shadow = tint || muted ? Shadows.none : isDark ? Shadows.none : elevated ? Shadows.md : Shadows.sm;

  const base: ViewStyle = {
    backgroundColor,
    borderRadius: radius ?? (elevated ? Radius.xl : Radius.lg),
    borderCurve: 'continuous',
    borderWidth: tint ? 0 : 1,
    borderColor,
    padding,
    boxShadow: shadow,
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
        pressed && {
          backgroundColor: tint ? tint.bg : colors.surfacePressed,
          boxShadow: Shadows.none,
          transform: [{ scale: 0.98 }],
          opacity: tint ? 0.92 : 1,
        },
        style,
      ]}>
      {children}
    </Pressable>
  );
}
