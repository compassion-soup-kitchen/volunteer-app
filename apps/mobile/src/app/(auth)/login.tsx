import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable } from 'react-native';

import { AuthScreen, AuthSwitch } from '@/components/auth/auth-screen';
import { IdentityProviders } from '@/components/auth/identity-providers';
import { Button, Card, Text, TextField } from '@/components/ui';
import { Shadows, Spacing } from '@/constants/theme';
import { useAnnounce } from '@/hooks/use-announce';
import { useAuth } from '@/providers/auth-provider';

export default function LoginScreen() {
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  useAnnounce(error);
  const [loading, setLoading] = useState(false);
  const [providerBusy, setProviderBusy] = useState(false);

  async function onSubmit() {
    setError(null);
    setLoading(true);
    const result = await signIn(email, password);
    setLoading(false);
    if (result.error) setError(result.error);
    // On success the (auth) layout guard redirects into the app automatically.
  }

  return (
    <AuthScreen
      overline="Nau mai, haere mai"
      title="Welcome back to the kitchen."
      subtitle="Sign in to see your roster and the mahi ahead.">
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
        <Link
          href={{ pathname: '/forgot-password', params: email.trim() ? { email: email.trim() } : {} }}
          asChild>
          <Pressable hitSlop={12} accessibilityRole="link" style={{ alignSelf: 'flex-end', marginTop: -Spacing.xs }}>
            <Text variant="callout" color="accent" weight="semibold">
              Forgot password?
            </Text>
          </Pressable>
        </Link>

        {error ? (
          <Text variant="caption" color="destructive" selectable>
            {error}
          </Text>
        ) : null}

        <Button title="Sign in" icon="log-in-outline" loading={loading} disabled={providerBusy} onPress={onSubmit} />
      </Card>

      <IdentityProviders disabled={loading} onBusyChange={setProviderBusy} onError={setError} />

      <AuthSwitch prompt="New to the kitchen?">
        <Link href="/register" asChild>
          <Pressable hitSlop={8}>
            <Text variant="callout" color="accent" weight="bold">
              Create an account
            </Text>
          </Pressable>
        </Link>
      </AuthSwitch>
    </AuthScreen>
  );
}
