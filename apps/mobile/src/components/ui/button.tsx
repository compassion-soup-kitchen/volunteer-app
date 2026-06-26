import * as Haptics from 'expo-haptics';
import { ActivityIndicator, type GestureResponderEvent, Pressable, type PressableProps, View } from 'react-native';

import { type ColorTokens, Radius, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { Icon, type IconName } from './icon';
import { Text } from './text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive';
type Size = 'md' | 'lg';

export type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  title: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
  fullWidth?: boolean;
  haptic?: boolean;
};

function palette(variant: Variant, c: ColorTokens) {
  switch (variant) {
    case 'primary':
      return { bg: c.primary, fg: c.primaryForeground, border: 'transparent', shadow: Shadows.primary };
    case 'destructive':
      return { bg: c.destructive, fg: c.destructiveForeground, border: 'transparent', shadow: Shadows.none };
    case 'secondary':
      return { bg: c.surface, fg: c.text, border: c.borderStrong, shadow: Shadows.sm };
    case 'ghost':
      return { bg: 'transparent', fg: c.primary, border: 'transparent', shadow: Shadows.none };
  }
}

export function Button({
  title,
  variant = 'primary',
  size = 'lg',
  loading = false,
  disabled = false,
  icon,
  fullWidth = true,
  haptic = true,
  onPress,
  ...rest
}: ButtonProps) {
  const { colors } = useTheme();
  const p = palette(variant, colors);
  const isDisabled = disabled || loading;
  const height = size === 'lg' ? 54 : 44;

  function handlePress(e: GestureResponderEvent) {
    if (haptic && process.env.EXPO_OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress?.(e);
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={handlePress}
      style={({ pressed }) => [
        {
          height,
          minHeight: 44,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: Spacing.sm,
          paddingHorizontal: Spacing.xl,
          borderRadius: Radius.md,
          borderCurve: 'continuous',
          backgroundColor: p.bg,
          borderWidth: variant === 'secondary' ? 1 : 0,
          borderColor: p.border,
          boxShadow: pressed ? Shadows.none : p.shadow,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          opacity: isDisabled ? 0.5 : pressed ? 0.92 : 1,
          transform: [{ scale: pressed && !isDisabled ? 0.985 : 1 }],
        },
      ]}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={p.fg} />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
          {icon ? <Icon name={icon} size={size === 'lg' ? 20 : 18} raw={p.fg} /> : null}
          <Text variant={size === 'lg' ? 'bodyStrong' : 'label'} style={{ color: p.fg }}>
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
