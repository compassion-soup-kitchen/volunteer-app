import { Link } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Kowhaiwhai, Wordmark } from '@/components/brand';
import { AppleButton, Button, Card, GoogleButton, Text, TextField } from '@/components/ui';
import { Duration, Layout, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/providers/auth-provider';
import { GOOGLE_SIGN_IN_AVAILABLE, isAppleSignInOffered } from '@/services/auth-service';

/** How far the sign-in card rises into the ink masthead, breaking the seam. */
const CARD_OVERLAP = 44;

const enter = (delay: number) =>
  FadeInDown.duration(Duration.slow).delay(delay).reduceMotion(ReduceMotion.System);

export default function LoginScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { signIn, signInWithGoogle, signInWithApple } = useAuth();

  const [email, setEmail] = useState('aroha@compassion.org.nz');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
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

  const busy = loading || googleLoading || appleLoading;

  async function onSubmit() {
    setError(null);
    setLoading(true);
    const result = await signIn(email, password);
    setLoading(false);
    if (result.error) setError(result.error);
    // On success the (auth) layout guard redirects into the app automatically.
  }

  async function onGoogle() {
    setError(null);
    setGoogleLoading(true);
    const result = await signInWithGoogle();
    setGoogleLoading(false);
    // Backing out of Google's sheet is a decision, not a failure - say nothing.
    if (result.error && !result.cancelled) setError(result.error);
  }

  async function onApple() {
    setError(null);
    setAppleLoading(true);
    const result = await signInWithApple();
    setAppleLoading(false);
    if (result.error && !result.cancelled) setError(result.error);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* The masthead is ink in both themes, so the status bar is always light. */}
      <StatusBar style="light" />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + Spacing.xl }}>
          {/* Ink masthead - the mission-quote panel language at full bleed: deep
              cocoa, a Pūaroha-red kōwhaiwhai trace flowing off the edge, the koru
              wordmark and a serif welcome set like an editorial cover. */}
          <View
            style={{
              backgroundColor: colors.inkSurface,
              paddingTop: insets.top + Spacing.xxl,
              paddingBottom: Spacing.huge + CARD_OVERLAP,
              paddingHorizontal: Layout.screenPadding,
              overflow: 'hidden',
            }}>
            <Kowhaiwhai
              width={width * 0.92}
              tint="#E4002B"
              opacity={0.26}
              style={{ position: 'absolute', top: -Spacing.xxxl, right: -width * 0.3 }}
            />
            <Animated.View
              entering={FadeIn.duration(Duration.slow).reduceMotion(ReduceMotion.System)}
              style={{ width: '100%', maxWidth: Layout.maxContentWidth, alignSelf: 'center', gap: Spacing.xxxl }}>
              <Wordmark height={28} color="onInk" />
              <View style={{ gap: Spacing.sm }}>
                <Text variant="overline" color="onInkMuted">
                  Nau mai, haere mai
                </Text>
                <Text variant="titleXl" color="onInk" style={{ maxWidth: 300 }}>
                  Welcome back to the kitchen.
                </Text>
                <Text variant="body" color="onInkMuted" style={{ maxWidth: 320 }}>
                  Sign in to see your roster and the mahi ahead.
                </Text>
              </View>
            </Animated.View>
          </View>

          {/* Paper - the form card breaks the masthead seam. */}
          <View
            style={{
              flex: 1,
              marginTop: -CARD_OVERLAP,
              paddingHorizontal: Layout.screenPadding,
              width: '100%',
              maxWidth: Layout.maxContentWidth,
              alignSelf: 'center',
              gap: Spacing.xl,
            }}>
            <Animated.View entering={enter(80)}>
              <Card elevated padding={Spacing.xl} style={{ gap: Spacing.lg, boxShadow: Shadows.lg }}>
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
                  placeholder="Your password"
                  secure
                  autoComplete="password"
                  textContentType="password"
                  returnKeyType="go"
                  onSubmitEditing={onSubmit}
                />

                {error ? (
                  <Text variant="caption" color="destructive" selectable>
                    {error}
                  </Text>
                ) : null}

                <Button
                  title="Sign in"
                  icon="log-in-outline"
                  loading={loading}
                  disabled={googleLoading || appleLoading}
                  onPress={onSubmit}
                />
              </Card>
            </Animated.View>

            <Animated.View entering={enter(160)} style={{ gap: Spacing.xl }}>
              {/* The identity providers. Each is hidden outright where it can't
                  work - no Google credentials in the build, no Apple sheet on
                  the device - rather than offered as a button that could only
                  fail. Apple leads: App Store guideline 4.8 asks for it to be
                  offered on equal terms with the other, and Apple's own HIG
                  puts its button at the top of the stack. */}
              {appleOffered || GOOGLE_SIGN_IN_AVAILABLE ? (
                <>
                  {/* Divider */}
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
                </>
              ) : null}

              {/* Register */}
              <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
                <Text variant="callout" color="textSecondary">
                  New to the kitchen?
                </Text>
                <Link href="/register" asChild>
                  <Pressable hitSlop={8}>
                    <Text variant="callout" color="accent" weight="bold">
                      Create an account
                    </Text>
                  </Pressable>
                </Link>
              </View>
            </Animated.View>

            {/* Colophon - pinned to the foot of the page on tall screens */}
            <View style={{ flex: 1 }} />
            <Animated.View entering={enter(240)}>
              <Text variant="caption" color="textTertiary" center>
                Te Pūaroha · Compassion Soup Kitchen · Pōneke Wellington
              </Text>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
