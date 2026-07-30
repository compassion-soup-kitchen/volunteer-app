import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthHero } from '@/components/auth-hero';
import { AppleButton, Button, Card, GoogleButton, Text, TextField } from '@/components/ui';
import { Layout, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/providers/auth-provider';
import { GOOGLE_SIGN_IN_AVAILABLE, isAppleSignInOffered } from '@/services/auth-service';

export default function RegisterScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { signUp, signInWithGoogle, signInWithApple } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
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

  const busy = loading || googleLoading || appleLoading;
  // Email the verification link went to; set when the account needs verifying
  // before it can sign in.
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function onSubmit() {
    setError(null);
    setLoading(true);
    const result = await signUp(name, email, password);
    setLoading(false);
    if (result.pendingVerification) {
      setSentTo(email.trim().toLowerCase());
      return;
    }
    if (result.error) setError(result.error);
    // On success the (auth) layout guard redirects into the app automatically.
  }

  // Both providers double as sign-up: a first-time identity becomes a PUBLIC
  // applicant here exactly as it would from the sign-in screen.
  async function onApple() {
    setError(null);
    setAppleLoading(true);
    const result = await signInWithApple();
    setAppleLoading(false);
    if (result.error && !result.cancelled) setError(result.error);
  }

  async function onGoogle() {
    setError(null);
    setGoogleLoading(true);
    const result = await signInWithGoogle();
    setGoogleLoading(false);
    if (result.error && !result.cancelled) setError(result.error);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            gap: Spacing.xl,
            paddingHorizontal: Layout.screenPadding,
            paddingTop: insets.top + Spacing.xl,
            paddingBottom: insets.bottom + Spacing.xl,
          }}>
          <View style={{ width: '100%', maxWidth: Layout.maxContentWidth, alignSelf: 'center', gap: Spacing.xl }}>
            <AuthHero
              overline="Tono mai"
              title="Join the whānau"
              subtitle="Create your account, then tell us a little about yourself - it takes about five minutes."
            />

            {sentTo ? (
              <Card style={{ gap: Spacing.md }}>
                <Text variant="heading">Check your inbox</Text>
                <Text variant="body" color="textSecondary">
                  We&apos;ve sent a verification link to{' '}
                  <Text variant="bodyStrong">{sentTo}</Text>. Tap it to activate your account,
                  then sign in below. The link is valid for 24 hours.
                </Text>
                <Text variant="callout" color="textSecondary">
                  Nothing after a few minutes? Have a look in your spam folder.
                </Text>
              </Card>
            ) : (
              <Card style={{ gap: Spacing.lg }}>
                <TextField
                  label="Full name"
                  value={name}
                  onChangeText={setName}
                  placeholder="Your name"
                  autoCapitalize="words"
                  autoComplete="name"
                  textContentType="name"
                  returnKeyType="next"
                />
                <TextField
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@email.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  textContentType="emailAddress"
                  returnKeyType="next"
                />
                <TextField
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="At least 8 characters"
                  secure
                  autoComplete="password-new"
                  textContentType="newPassword"
                  returnKeyType="go"
                  onSubmitEditing={onSubmit}
                  hint="Use at least 8 characters."
                />

                {error ? (
                  <Text variant="caption" color="destructive">
                    {error}
                  </Text>
                ) : null}

                <Button
                  title="Create account"
                  icon="person-add-outline"
                  loading={loading}
                  disabled={googleLoading || appleLoading}
                  onPress={onSubmit}
                />
              </Card>
            )}

            {/* Sign up with an identity provider instead. Hidden once the
                verification notice is up - the account already exists by then,
                and offering another way to make one would only confuse. */}
            {!sentTo && (appleOffered || GOOGLE_SIGN_IN_AVAILABLE) ? (
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
                    <AppleButton onPress={onApple} loading={appleLoading} disabled={busy && !appleLoading} />
                  ) : null}
                  {GOOGLE_SIGN_IN_AVAILABLE ? (
                    <GoogleButton
                      onPress={onGoogle}
                      loading={googleLoading}
                      disabled={busy && !googleLoading}
                    />
                  ) : null}
                </View>
              </View>
            ) : null}

            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
              <Text variant="callout" color="textSecondary">
                Already have an account?
              </Text>
              <Link href="/login" asChild>
                <Pressable hitSlop={8}>
                  <Text variant="callout" color="accent" weight="bold">
                    Sign in
                  </Text>
                </Pressable>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
