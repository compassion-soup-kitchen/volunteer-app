import { Link } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Kowhaiwhai, Wordmark } from '@/components/brand';
import { Button, Card, Icon, Text, TextField } from '@/components/ui';
import { Duration, Layout, Radius, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/providers/auth-provider';
import { useToast } from '@/providers/toast-provider';

/** How far the sign-in card rises into the ink masthead, breaking the seam. */
const CARD_OVERLAP = 44;

const enter = (delay: number) =>
  FadeInDown.duration(Duration.slow).delay(delay).reduceMotion(ReduceMotion.System);

export default function LoginScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { signIn } = useAuth();
  const toast = useToast();

  const [email, setEmail] = useState('aroha@compassion.org.nz');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    setLoading(true);
    const result = await signIn(email, password);
    setLoading(false);
    if (result.error) setError(result.error);
    // On success the (auth) layout guard redirects into the app automatically.
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

                <Button title="Sign in" icon="log-in-outline" loading={loading} onPress={onSubmit} />
              </Card>
            </Animated.View>

            <Animated.View entering={enter(160)} style={{ gap: Spacing.xl }}>
              {/* Divider */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
                <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
                <Text variant="caption" color="textTertiary">
                  or
                </Text>
                <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
              </View>

              {/* Google */}
              <Pressable
                accessibilityRole="button"
                onPress={() => toast.show('Google sign-in is coming soon.')}
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
                  borderColor: colors.borderStrong,
                  backgroundColor: pressed ? colors.surfacePressed : colors.surface,
                  boxShadow: pressed ? Shadows.none : Shadows.sm,
                })}>
                <Icon name="logo-google" size={20} color="text" />
                <Text variant="bodyStrong">Continue with Google</Text>
              </Pressable>

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
