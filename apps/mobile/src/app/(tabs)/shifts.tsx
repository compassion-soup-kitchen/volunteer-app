import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Fragment, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { BrowseShiftCard } from '@/components/browse-shift-card';
import { Chip, Divider, EmptyState, Icon, PageHeader, Screen, SkeletonCard, Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatLongDate } from '@/lib/format';
import { qk } from '@/lib/query-keys';
import { useToast } from '@/providers/toast-provider';
import { getAvailableShifts, getServiceAreas, signUpForShift } from '@/services/shifts-service';
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

/** A bordered square icon button (matches the design's search/filter affordance). */
function HeaderButton({ icon, onPress, label }: { icon: 'calendar-outline'; onPress: () => void; label: string }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 40,
        height: 40,
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.6 : 1,
      })}>
      <Icon name={icon} size={18} color="textSecondary" />
    </Pressable>
  );
}

export default function ShiftsScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const [areaFilter, setAreaFilter] = useState<string | null>(null);

  const { data: areas } = useQuery({ queryKey: qk.serviceAreas, queryFn: getServiceAreas });
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: qk.shifts(areaFilter ?? undefined),
    queryFn: () => getAvailableShifts(areaFilter ? { serviceAreaId: areaFilter } : undefined),
  });

  const book = useMutation({
    mutationFn: (shiftId: string) => signUpForShift(shiftId),
    onSuccess: (res) => {
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("You're on the roster — ka pai!");
      qc.invalidateQueries({ queryKey: qk.shiftsAll });
      qc.invalidateQueries({ queryKey: qk.dashboard });
    },
  });

  const groups = useMemo(() => groupByDate(data ?? []), [data]);

  return (
    <Screen onRefresh={refetch} refreshing={isRefetching}>
      <PageHeader
        overline="Te rārangi mahi"
        title="Shifts"
        subtitle="Pick a time to help."
        illustration="coffee"
        right={<HeaderButton icon="calendar-outline" label="My schedule" onPress={() => router.push('/schedule')} />}
      />

      {/* Service-area filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: Spacing.sm, paddingVertical: 2 }}>
        <Chip label="All" selected={areaFilter === null} onPress={() => setAreaFilter(null)} />
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
          <View key={group.date} style={{ gap: Spacing.xl }}>
            <Text variant="overline" color="textSecondary">
              {formatLongDate(group.date)}
            </Text>
            {group.items.map((shift, i) => (
              <Fragment key={shift.id}>
                {i > 0 ? <Divider /> : null}
                <BrowseShiftCard
                  areaName={shift.serviceArea.name}
                  date={shift.date}
                  startTime={shift.startTime}
                  endTime={shift.endTime}
                  signupCount={shift.signupCount}
                  capacity={shift.capacity}
                  signedUp={shift.userSignupStatus === 'SIGNED_UP'}
                  booking={book.isPending && book.variables === shift.id}
                  onPress={() => router.push({ pathname: '/shift/[id]', params: { id: shift.id } })}
                  onBook={() => book.mutate(shift.id)}
                />
              </Fragment>
            ))}
          </View>
        ))
      )}
    </Screen>
  );
}
