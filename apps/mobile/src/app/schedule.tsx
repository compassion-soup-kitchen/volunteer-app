import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { DateBlock } from '@/components/date-block';
import { Badge, type BadgeTone, Card, Icon, type IconName, Screen, SkeletonCard, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatTimeRange } from '@/lib/format';
import { qk } from '@/lib/query-keys';
import { getMySchedule, type ScheduleEntry, type ScheduleStatus } from '@/services/shifts-service';

const STATUS: Record<ScheduleStatus, { label: string; tone: BadgeTone; icon?: IconName }> = {
  CONFIRMED: { label: 'Confirmed', tone: 'success', icon: 'checkmark' },
  ATTENDED: { label: 'Attended', tone: 'neutral', icon: 'checkmark' },
  NO_SHOW: { label: 'Missed', tone: 'warning' },
};

/** A two-state pill toggle (Upcoming / Past). */
function Segmented({ value, onChange }: { value: 'upcoming' | 'past'; onChange: (v: 'upcoming' | 'past') => void }) {
  const { colors } = useTheme();
  const options: { key: 'upcoming' | 'past'; label: string }[] = [
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'past', label: 'Past' },
  ];
  return (
    <View style={{ flexDirection: 'row', backgroundColor: colors.backgroundSunken, borderRadius: 13, padding: 4 }}>
      {options.map((o) => {
        const active = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={{
              flex: 1,
              paddingVertical: 9,
              borderRadius: 10,
              alignItems: 'center',
              backgroundColor: active ? colors.surface : 'transparent',
              boxShadow: active ? '0px 1px 2px rgba(28,18,12,0.06)' : 'none',
            }}>
            <Text variant="label" color={active ? 'text' : 'textSecondary'}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ScheduleCard({ entry, onPress }: { entry: ScheduleEntry; onPress: () => void }) {
  const { colors } = useTheme();
  const status = STATUS[entry.status];
  return (
    <Card onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.lg }}>
      <DateBlock date={entry.date} />
      <View style={{ width: 1, alignSelf: 'stretch', backgroundColor: colors.border }} />
      <View style={{ flex: 1, gap: 3 }}>
        <Text variant="subheading" numberOfLines={1}>
          {entry.areaName}
        </Text>
        <Text variant="caption" color="textSecondary" numberOfLines={1}>
          {formatTimeRange(entry.startTime, entry.endTime)} · Tory St
        </Text>
      </View>
      <Badge label={status.label} tone={status.tone} icon={status.icon} />
    </Card>
  );
}

export default function ScheduleScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');

  const { data, isLoading, refetch, isRefetching } = useQuery({ queryKey: qk.schedule, queryFn: getMySchedule });
  const entries = tab === 'upcoming' ? data?.upcoming ?? [] : data?.past ?? [];

  return (
    <Screen onRefresh={refetch} refreshing={isRefetching} insetTop={false}>
      <View style={{ gap: 4 }}>
        <Text variant="overline" color="primary">
          Taku wātaka
        </Text>
        <Text variant="display">My schedule</Text>
        <Text variant="body" color="textSecondary">
          Your booked shifts.
        </Text>
      </View>

      <Segmented value={tab} onChange={setTab} />

      {isLoading ? (
        <View style={{ gap: Spacing.md }}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : entries.length === 0 ? (
        <Card style={{ alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xxl }}>
          <Icon name="calendar-outline" size={28} color="textTertiary" />
          <Text variant="subheading" center>
            {tab === 'upcoming' ? 'No upcoming shifts' : 'No past shifts yet'}
          </Text>
          <Text variant="caption" color="textSecondary" center>
            {tab === 'upcoming' ? 'Browse the roster to book your next shift.' : 'Your completed shifts will show here.'}
          </Text>
        </Card>
      ) : (
        <View style={{ gap: Spacing.md }}>
          {entries.map((e) => (
            <ScheduleCard
              key={e.id}
              entry={e}
              onPress={() => router.push({ pathname: '/shift/[id]', params: { id: e.id } })}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}
