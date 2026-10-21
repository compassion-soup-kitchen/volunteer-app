import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Alert, View } from 'react-native';

import {
  Badge,
  type BadgeTone,
  Button,
  Card,
  Divider,
  IconChip,
  Screen,
  SectionHeader,
  SkeletonCard,
  Text,
} from '@/components/ui';
import { Spacing } from '@/constants/theme';
import {
  describeLeaveStatus,
  formatLeaveLength,
  formatLeaveRange,
  leaveActions,
  leaveStage,
  type LeaveStage,
} from '@/lib/leave';
import { LEAVE_AFFECTS, qk } from '@/lib/query-keys';
import { useToast } from '@/providers/toast-provider';
import { cancelLeave, endLeaveNow, getMyLeave } from '@/services/leave-service';
import type { LeaveEntry, LeaveResult } from '@/types/models';

const STAGE: Record<LeaveStage, { label: string; tone: BadgeTone }> = {
  current: { label: 'Away now', tone: 'warning' },
  upcoming: { label: 'Coming up', tone: 'navy' },
  past: { label: 'Back', tone: 'neutral' },
};

function LeaveRow({
  entry,
  today,
  onEdit,
  onEnd,
  onCancel,
  busy,
}: {
  entry: LeaveEntry;
  today: string;
  /** Absent for past leave, which stays as it was. */
  onEdit?: () => void;
  onEnd?: () => void;
  onCancel?: () => void;
  busy?: boolean;
}) {
  const stage = leaveStage(entry, today);
  const actions = onEdit ? leaveActions(entry, today) : { canEdit: false, canEndNow: false, canCancel: false };
  const meta = [entry.reason, entry.loggedByName ? `Logged by ${entry.loggedByName}` : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={{ gap: Spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
        <IconChip icon="airplane-outline" tone={STAGE[stage].tone} size={38} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="bodyStrong">{formatLeaveRange(entry, today)}</Text>
          <Text variant="caption" color="textSecondary">
            {describeLeaveStatus(entry, today)} · {formatLeaveLength(entry)}
          </Text>
          {meta ? (
            <Text variant="caption" color="textTertiary" numberOfLines={2}>
              {meta}
            </Text>
          ) : null}
        </View>
        {/* Sections already say "coming up" and "past"; only being away now needs saying. */}
        {stage === 'current' ? <Badge label={STAGE[stage].label} tone={STAGE[stage].tone} /> : null}
      </View>

      {actions.canEdit ? (
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Button
              title={stage === 'current' ? 'Change' : 'Edit'}
              variant="secondary"
              size="md"
              disabled={busy}
              onPress={onEdit}
            />
          </View>
          {actions.canEndNow ? (
            <View style={{ flex: 1 }}>
              <Button title="I'm back" size="md" disabled={busy} onPress={onEnd} />
            </View>
          ) : null}
          {actions.canCancel ? (
            <View style={{ flex: 1 }}>
              <Button title="Cancel leave" variant="ghost" size="md" disabled={busy} onPress={onCancel} />
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export default function LeaveScreen() {
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const { data, isLoading, refetch, isRefetching } = useQuery({ queryKey: qk.leave, queryFn: getMyLeave });

  function done(result: LeaveResult, message: string) {
    if (result.error) {
      toast.error(result.error);
      return;
    }
    const back = result.restoredShifts ?? 0;
    toast.success(back > 0 ? `${message} You're back on ${back} regular ${back === 1 ? 'shift' : 'shifts'}.` : message);
    for (const queryKey of LEAVE_AFFECTS) qc.invalidateQueries({ queryKey });
  }

  const end = useMutation({
    mutationFn: (id: string) => endLeaveNow(id),
    onSuccess: (result) => done(result, 'Welcome back!'),
  });
  const cancel = useMutation({
    mutationFn: (id: string) => cancelLeave(id),
    onSuccess: (result) => done(result, 'Leave cancelled.'),
  });
  const busy = end.isPending || cancel.isPending;

  function confirmEnd(entry: LeaveEntry) {
    Alert.alert(
      'Back early? Nau mai anō!',
      "Your leave ends yesterday, and you go back on any repeating shifts that still have room.",
      [
        { text: 'Not yet', style: 'cancel' },
        { text: "I'm back", onPress: () => end.mutate(entry.id) },
      ],
    );
  }

  function confirmCancel(entry: LeaveEntry) {
    Alert.alert('Cancel this leave?', `${formatLeaveRange(entry)} comes off your record.`, [
      { text: 'Keep it', style: 'cancel' },
      { text: 'Cancel leave', style: 'destructive', onPress: () => cancel.mutate(entry.id) },
    ]);
  }

  const edit = (entry?: LeaveEntry) =>
    router.push(entry ? { pathname: '/leave/edit', params: { id: entry.id } } : '/leave/edit');

  const ahead = data ? [...(data.current ? [data.current] : []), ...data.upcoming] : [];

  return (
    <Screen onRefresh={refetch} refreshing={isRefetching} insetTop={false}>
      <View style={{ gap: 4 }}>
        <Text variant="overline" color="primary">
          Wā okioki
        </Text>
        <Text variant="display">My leave</Text>
        <Text variant="body" color="textSecondary">
          Going away? Let the kitchen know, and we&apos;ll take you off the roster while you&apos;re gone.
        </Text>
      </View>

      {isLoading || !data ? (
        <View style={{ gap: Spacing.md }}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : !data.canLog ? (
        <Card style={{ gap: Spacing.sm }}>
          <Text variant="subheading">Not yet</Text>
          <Text variant="body" color="textSecondary">
            Leave can be logged once your volunteer application is in.
          </Text>
        </Card>
      ) : (
        <>
          <Button title="Log leave" icon="add" onPress={() => edit()} />

          <View style={{ gap: Spacing.lg }}>
            <SectionHeader overline="Kei mua" title="Coming up" divider />
            {ahead.length === 0 ? (
              <Card style={{ alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xxl }}>
                <IconChip icon="sunny-outline" tone="success" size={44} />
                <Text variant="subheading" center>
                  No leave logged
                </Text>
                <Text variant="caption" color="textSecondary" center>
                  We&apos;ll see you on the roster.
                </Text>
              </Card>
            ) : (
              <Card style={{ gap: Spacing.lg }}>
                {ahead.map((entry, i) => (
                  <View key={entry.id} style={{ gap: Spacing.lg }}>
                    {i > 0 ? <Divider /> : null}
                    <LeaveRow
                      entry={entry}
                      today={data.today}
                      busy={busy}
                      onEdit={() => edit(entry)}
                      onEnd={() => confirmEnd(entry)}
                      onCancel={() => confirmCancel(entry)}
                    />
                  </View>
                ))}
              </Card>
            )}
          </View>

          {data.past.length > 0 ? (
            <View style={{ gap: Spacing.lg }}>
              <SectionHeader overline="Kua hipa" title="Past leave" divider />
              <Card style={{ gap: Spacing.lg }}>
                {data.past.map((entry, i) => (
                  <View key={entry.id} style={{ gap: Spacing.lg }}>
                    {i > 0 ? <Divider /> : null}
                    <LeaveRow entry={entry} today={data.today} />
                  </View>
                ))}
              </Card>
            </View>
          ) : null}
        </>
      )}
    </Screen>
  );
}
