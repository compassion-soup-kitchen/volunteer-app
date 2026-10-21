import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable } from 'react-native';

import { AuthScreen, AuthSwitch } from '@/components/auth/auth-screen';
import { IdentityProviders } from '@/components/auth/identity-providers';
import { Button, Card, Text, TextField } from '@/components/ui';
import { Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/providers/auth-provider';

export default function RegisterScreen() {
  const { signUp } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [providerBusy, setProviderBusy] = useState(false);
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

  return (
    <AuthScreen
      overline="Tono mai"
      title="Join the whānau"
      subtitle="Create your account, then tell us a little about yourself - it takes about five minutes.">
      {sentTo ? (
        <Card elevated padding={Spacing.xl} style={{ gap: Spacing.md, boxShadow: Shadows.lg }}>
          <Text variant="heading">Check your inbox</Text>
          <Text variant="body" color="textSecondary">
            We&apos;ve sent a verification link to <Text variant="bodyStrong">{sentTo}</Text>. Tap it to activate
            your account, then sign in below. The link is valid for 24 hours.
          </Text>
          <Text variant="callout" color="textSecondary">
            Nothing after a few minutes? Have a look in your spam folder.
          </Text>
        </Card>
      ) : (
        <Card elevated padding={Spacing.xl} style={{ gap: Spacing.lg, boxShadow: Shadows.lg }}>
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
            <Text variant="caption" color="destructive" selectable>
              {error}
            </Text>
          ) : null}

          <Button
            title="Create account"
            icon="person-add-outline"
            loading={loading}
            disabled={providerBusy}
            onPress={onSubmit}
          />
        </Card>
      )}

      {/* Hidden once the verification notice is up - the account already
          exists by then, and offering another way to make one would only
          confuse. */}
      {!sentTo ? <IdentityProviders disabled={loading} onBusyChange={setProviderBusy} onError={setError} /> : null}

      <AuthSwitch prompt="Already have an account?">
        <Link href="/login" asChild>
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
