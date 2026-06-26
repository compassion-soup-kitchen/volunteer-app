import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { ShiftCard } from '@/components/shift-card';
import { Chip, EmptyState, PageHeader, Screen, SkeletonCard, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { relativeDay } from '@/lib/format';
import { qk } from '@/lib/query-keys';
import { getAvailableShifts, getServiceAreas } from '@/services/shifts-service';
import type { ShiftWithDetails } from '@/types/models';

function groupByDate(shifts: ShiftWithDetails[]): { date: string; items: ShiftWithDetails[] }[] {
  const groups: { date: string; items: ShiftWithDetails[] }[] = [];
  for (const shift of shifts) {
    const last = groups[groups.length - 1];
    if (last && last.date === shift.date) last.items.push(shift);
    else groups.push({ date: shift.date, items: [shift] });
  }
  return groups;
}

function badgeFor(shift: ShiftWithDetails): { label: string; tone: 'success' | 'neutral' | 'brand'; icon?: 'checkmark' } {
  if (shift.userSignupStatus === 'SIGNED_UP') return { label: 'Signed up', tone: 'success', icon: 'checkmark' };
  const left = shift.capacity - shift.signupCount;
  if (left <= 0) return { label: 'Full', tone: 'neutral' };
  return { label: `${left} ${left === 1 ? 'spot' : 'spots'} left`, tone: 'brand' };
}

export default function ShiftsScreen() {
  const router = useRouter();
  const [areaFilter, setAreaFilter] = useState<string | null>(null);

  const { data: areas } = useQuery({ queryKey: qk.serviceAreas, queryFn: getServiceAreas });
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: qk.shifts(areaFilter ?? undefined),
    queryFn: () => getAvailableShifts(areaFilter ? { serviceAreaId: areaFilter } : undefined),
  });

  const groups = useMemo(() => groupByDate(data ?? []), [data]);

  return (
    <Screen onRefresh={refetch} refreshing={isRefetching}>
      <PageHeader overline="Te rārangi mahi" title="Shifts" subtitle="Find a shift and lend a hand." illustration="coffee" />

      {/* Service-area filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: Spacing.sm, paddingVertical: 2 }}>
        <Chip label="All areas" selected={areaFilter === null} onPress={() => setAreaFilter(null)} />
        {areas?.map((a) => (
          <Chip key={a.id} label={a.name} selected={areaFilter === a.id} onPress={() => setAreaFilter(a.id)} />
        ))}
      </ScrollView>

      {isLoading ? (
        <View style={{ gap: Spacing.lg }}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : groups.length === 0 ? (
        <EmptyState
          icon="calendar-outline"
          illustration="cafe"
          tone="brand"
          title="No shifts right now"
          message="Check back soon — new shifts are added each week."
        />
      ) : (
        groups.map((group) => (
          <View key={group.date} style={{ gap: Spacing.md }}>
            <Text variant="overline" color="textTertiary">
              {relativeDay(group.date)}
            </Text>
            {group.items.map((shift) => (
              <ShiftCard
                key={shift.id}
                areaId={shift.serviceArea.id}
                areaName={shift.serviceArea.name}
                date={shift.date}
                startTime={shift.startTime}
                endTime={shift.endTime}
                meta={`${shift.signupCount} of ${shift.capacity} signed up`}
                badge={badgeFor(shift)}
                notes={shift.notes}
                onPress={() => router.push({ pathname: '/shift/[id]', params: { id: shift.id } })}
              />
            ))}
          </View>
        ))
      )}
    </Screen>
  );
}
