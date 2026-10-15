import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, DateField, Divider, Icon, Skeleton, Text, TextField } from '@/components/ui';
import { Layout, Spacing } from '@/constants/theme';
import { formatShiftDate, formatTimeRange } from '@/lib/format';
import {
  LEAVE_REASON_MAX,
  addDaysIso,
  afterLeaveNote,
  formatLeaveLength,
  leaveFormProblem,
  leaveStage,
} from '@/lib/leave';
import { LEAVE_AFFECTS, qk } from '@/lib/query-keys';
import { useToast } from '@/providers/toast-provider';
import { getMyLeave, previewLeave, saveLeave } from '@/services/leave-service';

/** Picker dates are local midnight, built from parts so no timezone shifts the day. */
function localDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Logging or changing a stretch of leave. Shows which shifts it takes the
 * volunteer off before they save - nobody should find that out afterwards.
 */
export default function EditLeaveScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const qc = useQueryClient();

  const { data } = useQuery({ queryKey: qk.leave, queryFn: getMyLeave });
  const existing = id
    ? [data?.current, ...(data?.upcoming ?? [])].find((entry) => entry?.id === id) ?? null
    : null;
  const today = data?.today ?? '';
  const started = existing ? leaveStage(existing, today) === 'current' : false;

  const [startsOn, setStartsOn] = useState('');
  const [endsOn, setEndsOn] = useState('');
  const [reason, setReason] = useState('');
  const loaded = useRef(false);

  useEffect(() => {
    if (existing && !loaded.current) {
      loaded.current = true;
      setStartsOn(existing.startsOn);
      setEndsOn(existing.endsOn);
      setReason(existing.reason ?? '');
    }
  }, [existing]);

  const problem = today ? leaveFormProblem({ startsOn, endsOn, today, existing }) : null;
  const ready = Boolean(today && startsOn && endsOn && !problem);

  const preview = useQuery({
    queryKey: ['leave', 'preview', id ?? 'new', startsOn, endsOn],
    queryFn: () => previewLeave({ startsOn, endsOn, leaveId: id ?? null }),
    enabled: ready,
  });
  const result = preview.data;
  const blocker = result ? ('error' in result ? result.error : result.blocker) : null;
  const shifts = result && !('error' in result) ? result.shifts : [];

  const save = useMutation({
    mutationFn: () => saveLeave({ startsOn, endsOn, reason }, id ?? null),
    onSuccess: (res) => {
      if (res.error) {
        toast.error(res.error);
        return;
      }
      for (const queryKey of LEAVE_AFFECTS) qc.invalidateQueries({ queryKey });
      const off = res.removedShifts ?? 0;
      const back = res.restoredShifts ?? 0;
      toast.success(
        [
          id ? 'Leave updated.' : 'Leave logged - kia pai tō wā!',
          off > 0 ? `You're off ${off} ${off === 1 ? 'shift' : 'shifts'}.` : null,
          back > 0 ? `You're back on ${back} regular ${back === 1 ? 'shift' : 'shifts'}.` : null,
        ]
          .filter(Boolean)
          .join(' '),
      );
      router.back();
    },
  });

  if (id && !existing) {
    return (
      <View style={{ padding: Layout.screenPadding, gap: Spacing.md }}>
        <Stack.Screen options={{ title: 'Change leave' }} />
        {data ? (
          <Text variant="body" color="textSecondary">
            That leave can&apos;t be changed any more.
          </Text>
        ) : (
          <Skeleton height={120} width="100%" />
        )}
      </View>
    );
  }

  const canSave = ready && !preview.isFetching && !blocker && !save.isPending;
  const minEnd = started ? today : startsOn || today;

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          title: id ? 'Change leave' : 'Log leave',
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Cancel">
              <Icon name="close" size={26} color="textSecondary" />
            </Pressable>
          ),
        }}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: Layout.screenPadding, paddingBottom: insets.bottom + Spacing.huge }}>
          <View style={{ width: '100%', maxWidth: Layout.maxContentWidth, alignSelf: 'center', gap: Spacing.xl }}>
            <Card style={{ gap: Spacing.lg }}>
              {started ? (
                <View style={{ gap: 4 }}>
                  <Text variant="label">First day away</Text>
                  <Text variant="body">{formatShiftDate(startsOn)}</Text>
                  <Text variant="caption" color="textTertiary">
                    Already under way, so the first day stays as it is.
                  </Text>
                </View>
              ) : (
                <DateField
                  label="First day away"
                  value={startsOn}
                  onChange={(value) => {
                    setStartsOn(value);
                    if (value && endsOn && endsOn < value) setEndsOn(value);
                  }}
                  minimumDate={today ? localDate(addDaysIso(today, -30)) : undefined}
                  maximumDate={today ? localDate(addDaysIso(today, 730)) : undefined}
                />
              )}
              <DateField
                label="Last day away"
                value={endsOn}
                onChange={setEndsOn}
                minimumDate={today ? localDate(minEnd) : undefined}
                maximumDate={today ? localDate(addDaysIso(minEnd, 365)) : undefined}
                hint={
                  startsOn && endsOn && endsOn >= startsOn
                    ? `${formatLeaveLength({ startsOn, endsOn })} · back on ${formatShiftDate(addDaysIso(endsOn, 1))}`
                    : undefined
                }
              />
              <TextField
                label="Reason (optional)"
                value={reason}
                onChangeText={setReason}
                maxLength={LEAVE_REASON_MAX}
                placeholder="Overseas, surgery, exams…"
                hint="Only you and the kitchen team see this."
              />
            </Card>

            {/* What saving will do to the roster, before it happens. */}
            <View accessibilityLiveRegion="polite" style={{ gap: Spacing.md }}>
              {!startsOn || !endsOn ? (
                <Text variant="callout" color="textSecondary">
                  Choose your dates to see which shifts this affects.
                </Text>
              ) : problem || blocker ? (
                <Card tone="warning" style={{ flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' }}>
                  <Icon name="alert-circle" size={18} color="warning" />
                  <Text variant="callout" style={{ flex: 1 }}>
                    {problem ?? blocker}
                  </Text>
                </Card>
              ) : preview.isFetching || !result ? (
                <Skeleton height={64} width="100%" />
              ) : shifts.length === 0 ? (
                <Card tone="success" style={{ flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' }}>
                  <Icon name="checkmark-circle-outline" size={18} color="success" />
                  <Text variant="callout" style={{ flex: 1 }}>
                    {id
                      ? 'No more shifts come off the roster.'
                      : 'You’re not on any shifts then - nothing to change on the roster.'}
                  </Text>
                </Card>
              ) : (
                <>
                  <Text variant="label">
                    You&apos;ll come off {shifts.length === 1 ? 'this shift' : `these ${shifts.length} shifts`}:
                  </Text>
                  <Card style={{ gap: Spacing.md }}>
                    {shifts.map((shift, i) => (
                      <View key={shift.shiftId} style={{ gap: Spacing.md }}>
                        {i > 0 ? <Divider /> : null}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.md }}>
                          <Text variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
                            {shift.serviceAreaName}
                            {shift.isRegular ? (
                              <Text variant="caption" color="textTertiary">
                                {'  '}regular
                              </Text>
                            ) : null}
                          </Text>
                          <Text variant="caption" color="textSecondary">
                            {formatShiftDate(shift.date)}, {formatTimeRange(shift.startTime, shift.endTime)}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </Card>
                  <Text variant="caption" color="textTertiary">
                    {afterLeaveNote(shifts)}
                  </Text>
                </>
              )}
            </View>

            <Button
              title={id ? 'Save changes' : 'Log leave'}
              icon="checkmark"
              loading={save.isPending}
              disabled={!canSave}
              onPress={() => save.mutate()}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
