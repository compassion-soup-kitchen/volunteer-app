import { Link, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthHero } from '@/components/auth-hero';
import { Button, Card, Text, TextField } from '@/components/ui';
import { Layout, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { requestPasswordReset } from '@/services/auth-service';

export default function ForgotPasswordScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  // Carried over from the sign-in screen, so nobody types their address twice.
  const params = useLocalSearchParams<{ email?: string }>();

  const [email, setEmail] = useState(params.email ?? '');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

  async function onSubmit() {
    setError(null);
    setLoading(true);
    const result = await requestPasswordReset(email);
    setLoading(false);
    if (result.error) setError(result.error);
    else setSent(result.message ?? null);
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
              overline="Kia ora anō"
              title="Forgotten your password?"
              subtitle="Tell us your email and we'll send you a link to choose a new one."
            />

            {sent ? (
              <Card style={{ gap: Spacing.md }}>
                <Text variant="heading">Check your inbox</Text>
                <Text variant="body" color="textSecondary">
                  {sent}
                </Text>
                <Text variant="callout" color="textSecondary">
                  Open the link, choose a new password, then come back here and sign in with it.
                  Nothing after a few minutes? Have a look in your spam folder.
                </Text>
              </Card>
            ) : (
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
                  returnKeyType="send"
                  onSubmitEditing={onSubmit}
                />

                {error ? (
                  <Text variant="caption" color="destructive">
                    {error}
                  </Text>
                ) : null}

                <Button title="Send reset link" icon="mail-outline" loading={loading} onPress={onSubmit} />
              </Card>
            )}

            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
              <Text variant="callout" color="textSecondary">
                Remembered it?
              </Text>
              <Link href="/login" dismissTo asChild>
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
