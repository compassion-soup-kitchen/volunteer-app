import { Link, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable } from 'react-native';

import { AuthScreen, AuthSwitch } from '@/components/auth/auth-screen';
import { Button, Card, Text, TextField } from '@/components/ui';
import { Shadows, Spacing } from '@/constants/theme';
import { useAnnounce } from '@/hooks/use-announce';
import { requestPasswordReset } from '@/services/auth-service';

export default function ForgotPasswordScreen() {
  // Carried over from the sign-in screen, so nobody types their address twice.
  const params = useLocalSearchParams<{ email?: string }>();

  const [email, setEmail] = useState(params.email ?? '');
  const [error, setError] = useState<string | null>(null);
  useAnnounce(error);
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
    <AuthScreen
      overline="Kia ora anō"
      title="Forgotten your password?"
      subtitle="Tell us your email and we'll send you a link to choose a new one.">
      {sent ? (
        <Card elevated padding={Spacing.xl} style={{ gap: Spacing.md, boxShadow: Shadows.lg }}>
          <Text variant="heading">Check your inbox</Text>
          <Text variant="body" color="textSecondary">
            {sent}
          </Text>
          <Text variant="callout" color="textSecondary">
            Open the link, choose a new password, then come back here and sign in with it. Nothing after a few
            minutes? Have a look in your spam folder.
          </Text>
        </Card>
      ) : (
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
            returnKeyType="send"
            onSubmitEditing={onSubmit}
          />

          {error ? (
            <Text variant="caption" color="destructive" selectable>
              {error}
            </Text>
          ) : null}

          <Button title="Send reset link" icon="mail-outline" loading={loading} onPress={onSubmit} />
        </Card>
      )}

      <AuthSwitch prompt="Remembered it?">
        <Link href="/login" dismissTo asChild>
          <Pressable hitSlop={8}>
            <Text variant="callout" color="accent" weight="bold">
              Sign in
            </Text>
          </Pressable>
        </Link>
      </AuthSwitch>
    </AuthScreen>
  );
}
