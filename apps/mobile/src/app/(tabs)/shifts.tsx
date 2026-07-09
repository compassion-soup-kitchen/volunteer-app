import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addWeeks, differenceInCalendarDays, format, isSameWeek, parseISO, startOfWeek } from 'date-fns';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { BrowseShiftCard } from '@/components/browse-shift-card';
import { RosterShiftPill } from '@/components/roster-shift-pill';
import { Badge, Button, Chip, EmptyState, Screen, SectionHeader, SkeletonCard, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { qk } from '@/lib/query-keys';
import { useToast } from '@/providers/toast-provider';
import { getAvailableShifts, getMySchedule, getServiceAreas, signUpForShift } from '@/services/shifts-service';
import type { ShiftWithDetails } from '@/types/models';

/* -------------------------------------------------------------------------- */
/*  Grouping — open shifts become a week → day agenda                          */
/* -------------------------------------------------------------------------- */

const WEEK_OPTS = { weekStartsOn: 1 } as const;

type DayGroup = { date: string; weekday: string; dayMonth: string; relTag: string | null; items: ShiftWithDetails[] };
type WeekGroup = { key: string; label: string; count: number; days: DayGroup[] };

function groupShifts(shifts: ShiftWithDetails[]): WeekGroup[] {
  const today = new Date();
  const byDay = new Map<string, ShiftWithDetails[]>();
  for (const s of shifts) {
    const bucket = byDay.get(s.date);
    if (bucket) bucket.push(s);
    else byDay.set(s.date, [s]);
  }

  const weeks = new Map<string, WeekGroup>();
  for (const date of [...byDay.keys()].sort()) {
    const d = parseISO(date);
    const weekStart = startOfWeek(d, WEEK_OPTS);
    const weekKey = format(weekStart, 'yyyy-MM-dd');

    let week = weeks.get(weekKey);
    if (!week) {
      const label = isSameWeek(d, today, WEEK_OPTS)
        ? 'This week'
        : isSameWeek(d, addWeeks(today, 1), WEEK_OPTS)
          ? 'Next week'
          : `Week of ${format(weekStart, 'd MMM')}`;
      week = { key: weekKey, label, count: 0, days: [] };
      weeks.set(weekKey, week);
    }

    const diff = differenceInCalendarDays(d, today);
    const items = byDay.get(date)!;
    week.days.push({
      date,
      weekday: format(d, 'EEE').toUpperCase(),
      dayMonth: format(d, 'd MMMM'),
      relTag: diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : null,
      items,
    });
    week.count += items.length;
  }

  return [...weeks.values()];
}

/* -------------------------------------------------------------------------- */
/*  Small in-screen pieces                                                     */
/* -------------------------------------------------------------------------- */

/** Week separator: a quiet label trailed by a hairline rule. */
function WeekLabel({ label, count }: { label: string; count: number }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
      <Text variant="overline" color="textSecondary">
        {label}
      </Text>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
      <Text variant="caption" color="textTertiary">
        {count} open
      </Text>
    </View>
  );
}

/** Day heading inside a week: weekday + date, with a Today / Tomorrow tag. */
function DayHeader({ day }: { day: DayGroup }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
      <Text variant="overline" color="primary">
        {day.weekday}
      </Text>
      <Text variant="subheading">{day.dayMonth}</Text>
      {day.relTag ? <Badge label={day.relTag} tone={day.relTag === 'Today' ? 'brand' : 'neutral'} /> : null}
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*  Screen                                                                     */
/* -------------------------------------------------------------------------- */

export default function ShiftsScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const [areaFilter, setAreaFilter] = useState<string | null>(null);

  const { data: areas } = useQuery({ queryKey: qk.serviceAreas, queryFn: getServiceAreas });
  // The roster rail is the volunteer's own commitments — kept independent of the
  // area filter so it stays a stable anchor while they browse.
  const { data: schedule } = useQuery({ queryKey: qk.schedule, queryFn: getMySchedule });
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
      qc.invalidateQueries({ queryKey: qk.schedule });
      qc.invalidateQueries({ queryKey: qk.dashboard });
    },
  });

  // Booked shifts live in the top rail; the timeline below is open shifts only.
  const openShifts = useMemo(() => (data ?? []).filter((s) => s.userSignupStatus !== 'SIGNED_UP'), [data]);
  const weeks = useMemo(() => groupShifts(openShifts), [openShifts]);
  const roster = schedule?.upcoming ?? [];

  const subtitle = isLoading
    ? 'Finding times you can help.'
    : openShifts.length === 0
      ? 'No open shifts right now.'
      : `${openShifts.length} ${openShifts.length === 1 ? 'shift' : 'shifts'} open to pick up.`;

  return (
    <Screen onRefresh={refetch} refreshing={isRefetching} insetTop={false}>
      {/* Title */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.md }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text variant="overline" color="primary">
            Te rārangi mahi
          </Text>
          <Text variant="display">Shifts</Text>
          <Text variant="body" color="textSecondary">
            {subtitle}
          </Text>
        </View>
        <Button
          title="Roster"
          variant="secondary"
          size="md"
          icon="calendar-outline"
          fullWidth={false}
          onPress={() => router.push('/schedule')}
        />
      </View>

      {/* You're rostered on — personal anchor */}
      {roster.length > 0 ? (
        <View style={{ gap: Spacing.lg }}>
          <SectionHeader overline="Kua rīhita koe" title="You're rostered on" />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: Spacing.md, paddingVertical: 2, paddingRight: Spacing.lg }}>
            {roster.map((s) => (
              <RosterShiftPill
                key={s.id}
                areaName={s.areaName}
                date={s.date}
                startTime={s.startTime}
                endTime={s.endTime}
                onPress={() => router.push({ pathname: '/shift/[id]', params: { id: s.id } })}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}

      {/* Open shifts: filters + week/day agenda */}
      <View style={{ gap: Spacing.lg }}>
        <SectionHeader overline="Hei āwhina mai" title="Open shifts" divider={roster.length > 0} />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: Spacing.sm, paddingVertical: 2, paddingRight: Spacing.lg }}>
          <Chip label="All areas" selected={areaFilter === null} onPress={() => setAreaFilter(null)} />
          {areas?.map((a) => (
            <Chip key={a.id} label={a.name} selected={areaFilter === a.id} onPress={() => setAreaFilter(a.id)} />
          ))}
        </ScrollView>

        {isLoading ? (
          <View style={{ gap: Spacing.md }}>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : openShifts.length === 0 ? (
          <EmptyState
            icon="calendar-outline"
            illustration="cafe"
            tone="brand"
            title={areaFilter ? 'No open shifts here' : 'No open shifts right now'}
            message={
              areaFilter
                ? 'Try another area, or check back soon.'
                : 'New shifts are added each week — check back soon.'
            }
            actionLabel={areaFilter ? 'Show all areas' : undefined}
            onAction={areaFilter ? () => setAreaFilter(null) : undefined}
          />
        ) : (
          <View style={{ gap: Spacing.xxl }}>
            {weeks.map((week) => (
              <View key={week.key} style={{ gap: Spacing.lg }}>
                <WeekLabel label={week.label} count={week.count} />
                {week.days.map((day) => (
                  <View key={day.date} style={{ gap: Spacing.md }}>
                    <DayHeader day={day} />
                    {day.items.map((shift) => (
                      <BrowseShiftCard
                        key={shift.id}
                        areaName={shift.serviceArea.name}
                        startTime={shift.startTime}
                        endTime={shift.endTime}
                        signupCount={shift.signupCount}
                        capacity={shift.capacity}
                        signedUp={shift.userSignupStatus === 'SIGNED_UP'}
                        booking={book.isPending && book.variables === shift.id}
                        onPress={() => router.push({ pathname: '/shift/[id]', params: { id: shift.id } })}
                        onBook={() => book.mutate(shift.id)}
                      />
                    ))}
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}
      </View>
    </Screen>
  );
}
