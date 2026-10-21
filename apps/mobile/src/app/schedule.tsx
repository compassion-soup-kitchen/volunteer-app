import { SegmentedControl } from '@expo/ui/community/segmented-control';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { DateBlock } from '@/components/date-block';
import { Card, type CommitmentStatus, EmptyState, PageHeader, Screen, SkeletonCard, StatusBadge, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatTimeRange } from '@/lib/format';
import { qk } from '@/lib/query-keys';
import { getMySchedule, type ScheduleEntry, type ScheduleStatus } from '@/services/shifts-service';

/** The schedule's wire status, read as the shared commitment badge. */
const STATUS: Record<ScheduleStatus, CommitmentStatus> = {
  CONFIRMED: 'SIGNED_UP',
  ATTENDED: 'ATTENDED',
  NO_SHOW: 'NO_SHOW',
};

type Tab = 'upcoming' | 'past';
const TABS: { key: Tab; label: string }[] = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past', label: 'Past' },
];

function ScheduleCard({ entry, onPress }: { entry: ScheduleEntry; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Card onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.lg }}>
      <DateBlock date={entry.date} />
      <View style={{ width: 1, alignSelf: 'stretch', backgroundColor: colors.border }} />
      <View style={{ flex: 1, gap: 3 }}>
        <Text variant="subheading" numberOfLines={1}>
          {entry.areaName}
        </Text>
        <Text variant="caption" color="textSecondary" numberOfLines={1}>
          {formatTimeRange(entry.startTime, entry.endTime)}
        </Text>
      </View>
      <StatusBadge status={STATUS[entry.status]} />
    </Card>
  );
}

export default function ScheduleScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('upcoming');

  const { data, isLoading, refetch, isRefetching } = useQuery({ queryKey: qk.schedule, queryFn: getMySchedule });
  const entries = tab === 'upcoming' ? data?.upcoming ?? [] : data?.past ?? [];

  return (
    <Screen onRefresh={refetch} refreshing={isRefetching} insetTop={false}>
      <PageHeader overline="Taku wātaka" title="My schedule" subtitle="Your booked shifts." />

      <SegmentedControl
        values={TABS.map((t) => t.label)}
        selectedIndex={TABS.findIndex((t) => t.key === tab)}
        onChange={(e) => setTab(TABS[e.nativeEvent.selectedSegmentIndex].key)}
      />

      {isLoading ? (
        <View style={{ gap: Spacing.md }}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : entries.length === 0 ? (
        <EmptyState
          icon="calendar-outline"
          illustration={tab === 'upcoming' ? 'cafe' : 'heart'}
          tone="brand"
          title={tab === 'upcoming' ? 'No upcoming shifts' : 'No past shifts yet'}
          message={tab === 'upcoming' ? 'Browse the roster to book your next shift.' : 'Your completed shifts will show here.'}
          actionLabel={tab === 'upcoming' ? 'Browse shifts' : undefined}
          onAction={tab === 'upcoming' ? () => router.push('/shifts') : undefined}
        />
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
