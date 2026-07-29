import * as Haptics from 'expo-haptics';
import { ActivityIndicator, Pressable } from 'react-native';

import { Radius, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { Icon } from './icon';
import { Text } from './text';

/**
 * "Continue with Google" - carries the identity provider's own mark, so it
 * stays a hand-rolled Pressable rather than the SwiftUI-backed `Button`.
 * Everything else (54pt height, surface fill, press scale, spinner) matches
 * the secondary button so the two read as one control stack on the sign-in
 * screen.
 */
export function GoogleButton({
  onPress,
  loading = false,
  disabled = false,
  title = 'Continue with Google',
}: {
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  title?: string;
}) {
  const { colors } = useTheme();
  const isDisabled = disabled || loading;
  const inert = disabled && !loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={() => {
        if (process.env.EXPO_OS === 'ios') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onPress();
      }}
      style={({ pressed }) => ({
        height: 54,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        paddingHorizontal: Spacing.xxl,
        borderRadius: Radius.button,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: inert ? colors.border : colors.borderStrong,
        backgroundColor: pressed ? colors.surfacePressed : colors.surface,
        boxShadow: pressed ? Shadows.none : Shadows.sm,
        opacity: loading ? 0.92 : 1,
        transform: [{ scale: pressed && !isDisabled ? 0.97 : 1 }],
      })}>
      {loading ? (
        <ActivityIndicator color={colors.textSecondary} />
      ) : (
        <>
          <Icon name="logo-google" size={20} color={inert ? 'textTertiary' : 'text'} />
          <Text variant="bodyStrong" color={inert ? 'textTertiary' : 'text'}>
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}
