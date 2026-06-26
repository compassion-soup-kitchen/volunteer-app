import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthHero } from '@/components/auth-hero';
import { Button, Card, Divider, Text, TextField } from '@/components/ui';
import { Layout, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/providers/auth-provider';
import { useToast } from '@/providers/toast-provider';

export default function LoginScreen() {
  const { colors } = useTheme();
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
              overline="Nau mai, haere mai"
              title="Welcome back"
              subtitle="Sign in to see your roster and the mahi ahead."
            />

            <Card style={{ gap: Spacing.lg }}>
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
                <Text variant="caption" color="destructive">
                  {error}
                </Text>
              ) : null}

              <Button title="Sign in" icon="log-in-outline" loading={loading} onPress={onSubmit} />

              <Text variant="caption" color="textTertiary" center>
                Preview build — sign in with any email and password.
              </Text>
            </Card>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
              <Divider style={{ flex: 1 }} />
              <Text variant="caption" color="textTertiary">
                or
              </Text>
              <Divider style={{ flex: 1 }} />
            </View>

            <Button
              title="Continue with Google"
              variant="secondary"
              icon="logo-google"
              onPress={() => toast.show('Google sign-in is coming soon.')}
            />

            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
              <Text variant="callout" color="textSecondary">
                New to the kitchen?
              </Text>
              <Link href="/register" asChild>
                <Pressable hitSlop={8}>
                  <Text variant="callout" color="primary" style={{ fontWeight: '700' }}>
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
