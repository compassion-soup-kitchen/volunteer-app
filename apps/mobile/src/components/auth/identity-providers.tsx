import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { AppleButton, GoogleButton, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/providers/auth-provider';
import { GOOGLE_SIGN_IN_AVAILABLE, isAppleSignInOffered } from '@/services/auth-service';

export type IdentityProvidersProps = {
  /** The screen's own form is working, so neither provider may start */
  disabled: boolean;
  /** Tells the screen a provider sheet is open, so it can hold its own form */
  onBusyChange: (busy: boolean) => void;
  /** A provider's failure, or `null` when one starts afresh */
  onError: (message: string | null) => void;
};

/**
 * Sign in or sign up with Apple or Google, under an "or" rule. Both double as
 * sign-up: a first-time identity becomes a PUBLIC applicant either way.
 *
 * Each is hidden outright where it can't work - no Google credentials in the
 * build, no Apple sheet on the device - rather than offered as a button that
 * could only fail. Apple leads: App Store guideline 4.8 asks for it to be
 * offered on equal terms with the other, and Apple's own HIG puts its button
 * at the top of the stack.
 */
export function IdentityProviders({ disabled, onBusyChange, onError }: IdentityProvidersProps) {
  const { colors } = useTheme();
  const { signInWithGoogle, signInWithApple } = useAuth();
  const [pending, setPending] = useState<'apple' | 'google' | null>(null);
  // Whether this device can offer Apple's sheet at all - unlike Google's, it
  // can only be answered asynchronously, so the button appears once it's known
  // rather than flickering in and out.
  const [appleOffered, setAppleOffered] = useState(false);

  useEffect(() => {
    let active = true;
    isAppleSignInOffered().then((offered) => {
      if (active) setAppleOffered(offered);
    });
    return () => {
      active = false;
    };
  }, []);

  async function run(provider: 'apple' | 'google') {
    onError(null);
    setPending(provider);
    onBusyChange(true);
    const result = provider === 'apple' ? await signInWithApple() : await signInWithGoogle();
    setPending(null);
    onBusyChange(false);
    // Backing out of a provider's sheet is a decision, not a failure - say nothing.
    if (result.error && !result.cancelled) onError(result.error);
    // On success the (auth) layout guard redirects into the app automatically.
  }

  if (!appleOffered && !GOOGLE_SIGN_IN_AVAILABLE) return null;

  const blocked = disabled || pending !== null;

  return (
    <View style={{ gap: Spacing.xl }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
        <Text variant="caption" color="textTertiary">
          or
        </Text>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
      </View>

      <View style={{ gap: Spacing.md }}>
        {appleOffered ? (
          <AppleButton
            onPress={() => run('apple')}
            loading={pending === 'apple'}
            disabled={blocked && pending !== 'apple'}
          />
        ) : null}
        {GOOGLE_SIGN_IN_AVAILABLE ? (
          <GoogleButton
            onPress={() => run('google')}
            loading={pending === 'google'}
            disabled={blocked && pending !== 'google'}
          />
        ) : null}
      </View>
    </View>
  );
}
