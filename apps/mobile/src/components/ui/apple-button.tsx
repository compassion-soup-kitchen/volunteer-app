import { ActivityIndicator, View } from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * "Continue with Apple".
 *
 * Deliberately Apple's *own* native button rather than a hand-rolled Pressable
 * like `GoogleButton`. Apple's Human Interface Guidelines are prescriptive
 * about this mark - proportions, corner radius, the exact wordmark, and its
 * localisation - and App Review checks it. The native component gets all of
 * that right by construction and localises itself into te reo Māori or
 * anything else the phone is set to; a redrawn one is a rejection waiting to
 * happen.
 *
 * What we do control is made to match the control stack it sits in: the same
 * 54pt height and `Radius.button` corner as the Google button, and BLACK on a
 * light theme / WHITE on a dark one, which is Apple's own guidance for
 * contrast against the surface behind it.
 *
 * Imported lazily via `require` for the same reason the sign-in service is:
 * the module is native, so it isn't there in Expo Go, and a static import
 * would take the whole sign-in screen down instead of just hiding a button.
 */

const HEIGHT = 54;

let AppleAuth: typeof import('expo-apple-authentication') | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- must not throw at import time
  AppleAuth = require('expo-apple-authentication');
} catch {
  AppleAuth = null;
}

export function AppleButton({
  onPress,
  loading = false,
  disabled = false,
}: {
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  const { colors, isDark } = useTheme();

  if (!AppleAuth?.AppleAuthenticationButton) return null;

  // Apple's button has no loading or disabled state of its own, so while a
  // sign-in is in flight it is swapped for a spinner on the same footprint -
  // no layout shift, and nothing left tappable to double-submit.
  if (loading) {
    return (
      <View
        accessibilityRole="progressbar"
        accessibilityLabel="Signing in with Apple"
        style={{
          height: HEIGHT,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: Radius.button,
          borderCurve: 'continuous',
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
        }}>
        <ActivityIndicator color={colors.textSecondary} />
      </View>
    );
  }

  return (
    <View style={{ opacity: disabled ? 0.5 : 1 }} pointerEvents={disabled ? 'none' : 'auto'}>
      <AppleAuth.AppleAuthenticationButton
        buttonType={AppleAuth.AppleAuthenticationButtonType.CONTINUE}
        buttonStyle={
          isDark
            ? AppleAuth.AppleAuthenticationButtonStyle.WHITE
            : AppleAuth.AppleAuthenticationButtonStyle.BLACK
        }
        cornerRadius={Radius.button}
        style={{ width: '100%', height: HEIGHT }}
        onPress={onPress}
      />
    </View>
  );
}
