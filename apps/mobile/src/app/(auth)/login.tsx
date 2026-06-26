import { Link } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthGlassField } from '@/components/auth-glass-field';
import { AuthVideoBackground } from '@/components/auth-video-background';
import { Kowhaiwhai, Wordmark } from '@/components/brand';
import { Button, GlassPanel, Icon, Text } from '@/components/ui';
import { Layout, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/providers/auth-provider';
import { useToast } from '@/providers/toast-provider';

/** Light-on-glass colours for the always-dark, video-backed sign-in. */
const ON_GLASS = '#ffffff';
const ON_GLASS_DIM = 'rgba(255,255,255,0.74)';
const ON_GLASS_FAINT = 'rgba(255,255,255,0.5)';
const ON_GLASS_ERROR = '#ff9aa1';
const HAIRLINE = 'rgba(255,255,255,0.22)';
const HERO_SHADOW = { textShadowColor: 'rgba(0,0,0,0.45)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 12 } as const;

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
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
    <View style={{ flex: 1, backgroundColor: '#100e0a' }}>
      <StatusBar style="light" />
      <AuthVideoBackground />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            gap: Spacing.xl,
            paddingHorizontal: Layout.screenPadding,
            paddingTop: insets.top + Spacing.huge,
            paddingBottom: insets.bottom + Spacing.xl,
          }}>
          <View style={{ width: '100%', maxWidth: Layout.maxContentWidth, alignSelf: 'center', gap: Spacing.xl }}>
            {/* Hero — light text floats directly on the footage */}
            <View style={{ alignItems: 'center', gap: 16 }}>
              <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 10 }}>
                <View
                  pointerEvents="none"
                  style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
                  <Kowhaiwhai width={236} color="primaryForeground" opacity={0.14} />
                </View>
                <Wordmark height={30} color="primaryForeground" />
              </View>
              <View style={{ alignItems: 'center', gap: 6 }}>
                <Text variant="overline" style={{ color: ON_GLASS_DIM, ...HERO_SHADOW }}>
                  Nau mai, haere mai
                </Text>
                <Text variant="titleXl" center style={{ color: ON_GLASS, ...HERO_SHADOW }}>
                  Welcome back
                </Text>
                <Text variant="body" center style={{ color: ON_GLASS_DIM, maxWidth: 320, ...HERO_SHADOW }}>
                  Sign in to see your roster and the mahi ahead.
                </Text>
              </View>
            </View>

            {/* Liquid glass sign-in card */}
            <GlassPanel style={{ borderRadius: Radius.xl, padding: Spacing.xl, gap: Spacing.lg }}>
              <AuthGlassField
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
              <AuthGlassField
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
                <Text variant="caption" selectable style={{ color: ON_GLASS_ERROR }}>
                  {error}
                </Text>
              ) : null}

              <Button title="Sign in" icon="log-in-outline" loading={loading} onPress={onSubmit} />
            </GlassPanel>

            {/* Divider */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
              <View style={{ flex: 1, height: 1, backgroundColor: HAIRLINE }} />
              <Text variant="caption" style={{ color: ON_GLASS_FAINT }}>
                or
              </Text>
              <View style={{ flex: 1, height: 1, backgroundColor: HAIRLINE }} />
            </View>

            {/* Google — interactive liquid glass button */}
            <GlassPanel isInteractive style={{ borderRadius: Radius.pill }}>
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
                  opacity: pressed ? 0.8 : 1,
                })}>
                <Icon name="logo-google" size={20} raw={ON_GLASS} />
                <Text variant="bodyStrong" style={{ color: ON_GLASS }}>
                  Continue with Google
                </Text>
              </Pressable>
            </GlassPanel>

            {/* Register */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
              <Text variant="callout" style={{ color: ON_GLASS_DIM }}>
                New to the kitchen?
              </Text>
              <Link href="/register" asChild>
                <Pressable hitSlop={8}>
                  <Text variant="callout" weight="bold" style={{ color: ON_GLASS }}>
                    Create an account
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
