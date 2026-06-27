import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { Wordmark } from '@/components/brand';
import { Button, Card, Icon, ProgressBar, Screen, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type StepState = 'done' | 'current' | 'locked';

const STEPS: { title: string; hint: string; state: StepState }[] = [
  { title: 'Safety briefing', hint: 'Done', state: 'done' },
  { title: 'Sign agreement', hint: 'Done', state: 'done' },
  { title: 'Meet your coordinator', hint: 'Up next', state: 'current' },
  { title: 'Your first shift', hint: 'Locked', state: 'locked' },
];

function StepMarker({ index, state }: { index: number; state: StepState }) {
  const { colors } = useTheme();
  if (state === 'done') {
    return (
      <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="checkmark" size={16} raw={colors.primaryForeground} />
      </View>
    );
  }
  const current = state === 'current';
  return (
    <View
      style={{
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: current ? colors.surface : colors.surfaceMuted,
        borderWidth: current ? 2 : 0,
        borderColor: colors.primary,
      }}>
      <Text variant="label" style={{ color: current ? colors.primary : colors.textTertiary }}>
        {index + 1}
      </Text>
    </View>
  );
}

export default function OnboardingScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const done = STEPS.filter((s) => s.state === 'done').length;
  const pct = Math.round((done / STEPS.length) * 100);

  return (
    <Screen insetTop={false} gap={Spacing.xl}>
      <Wordmark height={20} />

      <View style={{ gap: Spacing.md }}>
        <Text variant="overline" color="primary">
          Volunteer
        </Text>
        <Text variant="titleXl">Nau mai,{'\n'}haere mai.</Text>
        <Text variant="body" color="textSecondary">
          Welcome to the Compassion Soup Kitchen volunteer whānau. Let&apos;s get you ready for your first shift.
        </Text>
      </View>

      <Card style={{ gap: 0, paddingVertical: Spacing.xs }}>
        {STEPS.map((step, i) => (
          <View
            key={step.title}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: Spacing.lg,
              paddingVertical: Spacing.md,
              borderBottomWidth: i < STEPS.length - 1 ? 1 : 0,
              borderBottomColor: colors.border,
            }}>
            <StepMarker index={i} state={step.state} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="subheading" color={step.state === 'locked' ? 'textTertiary' : 'text'}>
                {step.title}
              </Text>
              <Text variant="caption" color={step.state === 'current' ? 'primary' : 'textSecondary'}>
                {step.hint}
              </Text>
            </View>
            {step.state === 'current' ? <Icon name="chevron-forward" size={18} color="textTertiary" /> : null}
          </View>
        ))}
      </Card>

      <View style={{ gap: Spacing.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text variant="label" color="textSecondary">
            {done} of {STEPS.length} complete
          </Text>
          <Text variant="label" color="textSecondary">
            {pct}%
          </Text>
        </View>
        <ProgressBar value={done / STEPS.length} />
        <Button title="Continue" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}
