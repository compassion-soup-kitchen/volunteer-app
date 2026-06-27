import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Alert, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { trainingTypeMeta } from '@/components/meta';
import { Badge, Button, Card, EmptyState, Icon, type IconName, Text } from '@/components/ui';
import { Layout, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatLongDate, formatTimeRange } from '@/lib/format';
import { qk } from '@/lib/query-keys';
import { useToast } from '@/providers/toast-provider';
import {
  cancelTrainingRegistration,
  getTrainingById,
  registerForTraining,
} from '@/services/training-service';
import type { ActionResult } from '@/types/models';

/** The kitchen's single venue — the default when a session has no location set. */
const VENUE = '132 Tory Street, Te Aro, Pōneke';

function FactRow({ icon, value }: { icon: IconName; value: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
      <Icon name={icon} size={19} color="primary" />
      <Text variant="callout" color="text" style={{ flex: 1 }}>
        {value}
      </Text>
    </View>
  );
}

export default function TrainingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const qc = useQueryClient();

  const { data: session, isLoading } = useQuery({
    queryKey: qk.trainingSession(id),
    queryFn: () => getTrainingById(id),
  });

  function afterMutation(result: ActionResult, successMessage: string) {
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(successMessage);
    qc.invalidateQueries({ queryKey: qk.trainingSession(id) });
    qc.invalidateQueries({ queryKey: qk.trainingOverview });
    qc.invalidateQueries({ queryKey: qk.training });
    qc.invalidateQueries({ queryKey: qk.dashboard });
  }

  const register = useMutation({
    mutationFn: () => registerForTraining(id),
    onSuccess: (res) => afterMutation(res, "You're registered — see you there!"),
  });

  const cancel = useMutation({
    mutationFn: () => cancelTrainingRegistration(id),
    onSuccess: (res) => afterMutation(res, 'Registration cancelled.'),
  });

  const pending = register.isPending || cancel.isPending;

  function confirmCancel() {
    Alert.alert('Cancel registration?', 'Your place will open up for another volunteer.', [
      { text: 'Keep my place', style: 'cancel' },
      { text: 'Cancel', style: 'destructive', onPress: () => cancel.mutate() },
    ]);
  }

  // A fixed height keeps the fit-to-contents sheet from collapsing while we wait.
  if (isLoading) {
    return (
      <View style={{ height: 280, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={{ minHeight: 320, backgroundColor: colors.background, justifyContent: 'center' }}>
        <EmptyState
          icon="school-outline"
          illustration="book"
          title="Session not found"
          message="This training session may have been removed."
        />
      </View>
    );
  }

  const meta = trainingTypeMeta(session.type);
  const isRegistered = session.userAttendanceStatus === 'REGISTERED';
  const isFull = session.registeredCount >= session.capacity && !isRegistered;

  return (
    <View style={{ backgroundColor: colors.background }}>
      {/* Content (the sheet sizes itself to this) */}
      <View
        style={{
          width: '100%',
          maxWidth: Layout.maxContentWidth,
          alignSelf: 'center',
          paddingHorizontal: Layout.screenPadding,
          paddingTop: Spacing.xxxl,
        }}>
        {/* Type + title */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' }}>
          <Badge label={meta.label} tone={meta.tone} icon={meta.icon} />
          {isRegistered ? (
            <Badge label="Registered" tone="success" icon="checkmark-circle" />
          ) : isFull ? (
            <Badge label="Full" tone="neutral" />
          ) : null}
        </View>
        <Text variant="display" style={{ marginTop: Spacing.md }}>
          {session.title}
        </Text>

        {/* Facts */}
        <View style={{ gap: 13, marginTop: Spacing.xl }}>
          <FactRow
            icon="calendar-outline"
            value={`${formatLongDate(session.date)} · ${formatTimeRange(session.startTime, session.endTime)}`}
          />
          <FactRow icon="location-outline" value={session.location ?? VENUE} />
          <FactRow icon="people-outline" value={`${session.registeredCount} of ${session.capacity} registered`} />
        </View>

        {/* About this session */}
        {session.description ? (
          <View style={{ marginTop: Spacing.xl, gap: Spacing.md }}>
            <Text variant="overline" color="textSecondary">
              About this session
            </Text>
            <Text variant="body" color="text" style={{ lineHeight: 26 }}>
              {session.description}
            </Text>
          </View>
        ) : null}

        {isRegistered ? (
          <Card muted style={{ gap: 6, marginTop: Spacing.xl }}>
            <Text variant="label" color="textSecondary">
              You&apos;re booked in
            </Text>
            <Text variant="body">Kia kaha — we&apos;ll see you there.</Text>
          </Card>
        ) : null}
      </View>

      {/* Footer — last element, so the fit-to-contents sheet ends flush at the bottom */}
      <View
        style={{
          marginTop: Spacing.xl,
          paddingHorizontal: Layout.screenPadding,
          paddingTop: Spacing.md,
          paddingBottom: insets.bottom + Spacing.md,
          backgroundColor: colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}>
        <View style={{ width: '100%', maxWidth: Layout.maxContentWidth, alignSelf: 'center' }}>
          {isRegistered ? (
            <Button
              title="Cancel registration"
              variant="secondary"
              icon="close-circle-outline"
              loading={cancel.isPending}
              disabled={pending}
              onPress={confirmCancel}
            />
          ) : isFull ? (
            <Button title="This session is full" variant="secondary" disabled onPress={() => {}} />
          ) : (
            <Button
              title="Register"
              icon="checkmark"
              loading={register.isPending}
              disabled={pending}
              onPress={() => register.mutate()}
            />
          )}
        </View>
      </View>
    </View>
  );
}
