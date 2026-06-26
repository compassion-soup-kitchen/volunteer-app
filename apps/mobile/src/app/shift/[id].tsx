import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Alert, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { serviceAreaMeta } from '@/components/meta';
import { Badge, Button, Card, Divider, EmptyState, Icon, IconChip, Text } from '@/components/ui';
import { Layout, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDuration, formatLongDate, formatTimeRange } from '@/lib/format';
import { qk } from '@/lib/query-keys';
import { useToast } from '@/providers/toast-provider';
import { cancelShiftSignup, getShiftById, signUpForShift } from '@/services/shifts-service';
import type { ActionResult } from '@/types/models';

function hoursBetween(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return Math.max(0, eh * 60 + em - (sh * 60 + sm)) / 60;
}

function DetailRow({ icon, label, value }: { icon: 'calendar-outline' | 'time-outline' | 'people-outline'; label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
      <Icon name={icon} size={20} color="textSecondary" />
      <View style={{ flex: 1 }}>
        <Text variant="caption" color="textTertiary">
          {label}
        </Text>
        <Text variant="bodyStrong">{value}</Text>
      </View>
    </View>
  );
}

export default function ShiftDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const qc = useQueryClient();

  const { data: shift, isLoading } = useQuery({ queryKey: qk.shift(id), queryFn: () => getShiftById(id) });

  function afterMutation(result: ActionResult, successMessage: string) {
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(successMessage);
    qc.invalidateQueries({ queryKey: qk.shift(id) });
    qc.invalidateQueries({ queryKey: qk.shiftsAll });
    qc.invalidateQueries({ queryKey: qk.dashboard });
  }

  const signUp = useMutation({
    mutationFn: () => signUpForShift(id),
    onSuccess: (res) => afterMutation(res, "You're on the roster — ka pai!"),
  });

  const cancel = useMutation({
    mutationFn: () => cancelShiftSignup(id),
    onSuccess: (res) => afterMutation(res, 'Your spot has been released.'),
  });

  const pending = signUp.isPending || cancel.isPending;

  function confirmCancel() {
    Alert.alert('Cancel this shift?', 'Your spot will open up for another volunteer.', [
      { text: 'Keep my spot', style: 'cancel' },
      { text: 'Cancel shift', style: 'destructive', onPress: () => cancel.mutate() },
    ]);
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!shift) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center' }}>
        <EmptyState
          icon="help-circle-outline"
          illustration="candle"
          title="Shift not found"
          message="This shift may have been removed."
        />
      </View>
    );
  }

  const area = serviceAreaMeta(shift.serviceArea.id);
  const spotsLeft = shift.capacity - shift.signupCount;
  const isSignedUp = shift.userSignupStatus === 'SIGNED_UP';
  const isFull = spotsLeft <= 0 && !isSignedUp;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: shift.serviceArea.name }} />

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: Layout.screenPadding, paddingBottom: 160, gap: Spacing.lg }}>
        <View style={{ width: '100%', maxWidth: Layout.maxContentWidth, alignSelf: 'center', gap: Spacing.lg }}>
          {/* Hero */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
            <IconChip icon={area.icon} tone={area.tone} size={56} />
            <View style={{ flex: 1, gap: 2 }}>
              {shift.serviceArea.maori ? (
                <Text variant="overline" color="primary">
                  {shift.serviceArea.maori}
                </Text>
              ) : null}
              <Text variant="titleXl">{shift.serviceArea.name}</Text>
            </View>
          </View>

          {isSignedUp ? <Badge label="You're signed up" tone="success" icon="checkmark-circle" /> : null}

          <Card style={{ gap: Spacing.lg }}>
            <DetailRow icon="calendar-outline" label="Date" value={formatLongDate(shift.date)} />
            <Divider />
            <DetailRow
              icon="time-outline"
              label="Time"
              value={`${formatTimeRange(shift.startTime, shift.endTime)}  ·  ${formatDuration(hoursBetween(shift.startTime, shift.endTime))}`}
            />
            <Divider />
            <DetailRow
              icon="people-outline"
              label="Volunteers"
              value={`${shift.signupCount} of ${shift.capacity} signed up${isFull ? ' · full' : spotsLeft > 0 ? ` · ${spotsLeft} ${spotsLeft === 1 ? 'spot' : 'spots'} left` : ''}`}
            />
          </Card>

          {shift.notes ? (
            <Card muted style={{ gap: 6 }}>
              <Text variant="label" color="textSecondary">
                Notes from the team
              </Text>
              <Text variant="body">{shift.notes}</Text>
            </Card>
          ) : null}

          <Text variant="caption" color="textTertiary">
            Ngā mihi nui — thank you for showing up for our community.
          </Text>
        </View>
      </ScrollView>

      {/* Sticky action */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: Layout.screenPadding,
          paddingTop: Spacing.md,
          paddingBottom: insets.bottom + Spacing.md,
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          boxShadow: '0px -6px 20px rgba(43,33,18,0.07)',
        }}>
        <View style={{ width: '100%', maxWidth: Layout.maxContentWidth, alignSelf: 'center' }}>
          {isSignedUp ? (
            <Button title="Cancel my spot" variant="secondary" icon="close-circle-outline" loading={cancel.isPending} disabled={pending} onPress={confirmCancel} />
          ) : isFull ? (
            <Button title="This shift is full" variant="secondary" disabled onPress={() => {}} />
          ) : (
            <Button title="Sign up for this shift" icon="checkmark" loading={signUp.isPending} disabled={pending} onPress={() => signUp.mutate()} />
          )}
        </View>
      </View>
    </View>
  );
}
