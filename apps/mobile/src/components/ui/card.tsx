import { type ReactNode } from 'react';
import { Pressable, type StyleProp, View, type ViewStyle } from 'react-native';

import { Radius, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type CardProps = {
  children: ReactNode;
  onPress?: () => void;
  padding?: number;
  /** Use a quieter, recessed surface (for nested blocks) */
  muted?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

/**
 * The app's surface primitive: a rounded, gently elevated card. Pass `onPress`
 * to make it an accessible, press-responsive tappable surface.
 */
export function Card({ children, onPress, padding = Spacing.lg, muted, style, accessibilityLabel }: CardProps) {
  const { colors, isDark } = useTheme();

  const base: ViewStyle = {
    backgroundColor: muted ? colors.surfaceMuted : colors.surface,
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    padding,
    boxShadow: isDark || muted ? Shadows.none : Shadows.sm,
  };

  if (!onPress) {
    return <View style={[base, style]}>{children}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        base,
        pressed && { backgroundColor: colors.surfacePressed, transform: [{ scale: 0.992 }] },
        style,
      ]}>
      {children}
    </Pressable>
  );
}
