import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Wordmark } from '@/components/brand';
import { Button, Card, Icon, ProgressBar, Screen, SkeletonCard, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { type OnboardingAction, type OnboardingStep, type OnboardingStepState, onboardingSteps } from '@/lib/onboarding';
import { qk } from '@/lib/query-keys';
import { getVolunteerProfile } from '@/services/profile-service';
import { getTrainingOverview } from '@/services/training-service';

function StepMarker({ index, state }: { index: number; state: OnboardingStepState }) {
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

function StepRow({
  step,
  index,
  last,
  onAction,
}: {
  step: OnboardingStep;
  index: number;
  last: boolean;
  onAction: (action: OnboardingAction) => void;
}) {
  const { colors } = useTheme();
  const { action } = step;
  const body = (
    <>
      <StepMarker index={index} state={step.state} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="subheading" color={step.state === 'locked' ? 'textTertiary' : 'text'}>
          {step.title}
        </Text>
        <Text variant="caption" color={step.state === 'current' ? 'primary' : 'textSecondary'}>
          {step.hint}
        </Text>
      </View>
      {action ? <Icon name="chevron-forward" size={18} color="textTertiary" /> : null}
    </>
  );
  const row = {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: last ? 0 : 1,
    borderBottomColor: colors.border,
  } as const;

  if (!action) return <View style={row}>{body}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${step.title}, ${step.hint}`}
      onPress={() => onAction(action)}
      style={({ pressed }) => [row, { opacity: pressed ? 0.6 : 1 }]}>
      {body}
    </Pressable>
  );
}

/**
 * The road to a first shift, drawn from the volunteer's own record: their
 * status, their background check and their induction booking. Reached from
 * Profile while they are still onboarding.
 */
export default function OnboardingScreen() {
  const router = useRouter();
  const profile = useQuery({ queryKey: qk.profile, queryFn: getVolunteerProfile });
  const training = useQuery({ queryKey: qk.trainingOverview, queryFn: getTrainingOverview });

  const module = training.data?.readiness.modules.find((m) => m.type === 'INDUCTION') ?? null;
  const session = training.data?.registered.find((s) => s.type === 'INDUCTION') ?? null;
  const steps = profile.data
    ? onboardingSteps({
        status: profile.data.status,
        mojStatus: profile.data.mojStatus,
        induction: module ? { state: module.state, date: module.date, sessionId: session?.id ?? null } : null,
      })
    : null;

  const done = steps?.filter((s) => s.state === 'done').length ?? 0;
  const total = steps?.length ?? 0;
  const next = steps?.find((s) => s.state === 'current')?.action;

  function act(action: OnboardingAction) {
    if (action.kind === 'book-induction') router.push('/training');
    else router.push({ pathname: '/training/[id]', params: { id: action.sessionId } });
  }

  return (
    <Screen
      insetTop={false}
      gap={Spacing.xl}
      onRefresh={() => {
        profile.refetch();
        training.refetch();
      }}
      refreshing={profile.isRefetching || training.isRefetching}>
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

      {!steps || training.isLoading ? (
        <SkeletonCard />
      ) : (
        <>
          <Card style={{ gap: 0, paddingVertical: Spacing.xs }}>
            {steps.map((step, i) => (
              <StepRow key={step.key} step={step} index={i} last={i === steps.length - 1} onAction={act} />
            ))}
          </Card>

          <View style={{ gap: Spacing.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text variant="label" color="textSecondary">
                {done} of {total} complete
              </Text>
              <Text variant="label" color="textSecondary">
                {Math.round((done / total) * 100)}%
              </Text>
            </View>
            <ProgressBar value={done / total} />
            {/* Only when the next step is the volunteer's to take; while the team
                has it, there is nothing for a button to do. */}
            {next ? (
              <Button
                title={next.kind === 'book-induction' ? 'Book your induction' : 'See your induction'}
                icon="school-outline"
                onPress={() => act(next)}
              />
            ) : null}
          </View>
        </>
      )}
    </Screen>
  );
}
