import { useQuery } from '@tanstack/react-query';
import { View } from 'react-native';

import { serviceAreaMeta } from '@/components/meta';
import { MilestoneProgress } from '@/components/milestone-progress';
import {
  Card,
  Divider,
  EmptyState,
  Icon,
  IconChip,
  PageHeader,
  ProgressBar,
  Screen,
  SectionHeader,
  SkeletonCard,
  Stat,
  Text,
} from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { qk } from '@/lib/query-keys';
import { getVolunteerHoursData } from '@/services/hours-service';
import type { HoursByArea, HoursByMonth } from '@/types/models';

function MonthBars({ data }: { data: HoursByMonth[] }) {
  const { colors } = useTheme();
  const max = Math.max(...data.map((m) => m.hours), 1);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: Spacing.sm, height: 150 }}>
      {data.map((m) => (
        <View key={m.month} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
          <Text variant="mono" color="textSecondary">
            {m.hours}
          </Text>
          <View
            style={{
              width: '64%',
              height: Math.max(4, (m.hours / max) * 96),
              backgroundColor: colors.primary,
              borderTopLeftRadius: Radius.sm,
              borderTopRightRadius: Radius.sm,
            }}
          />
          <Text variant="caption" color="textTertiary">
            {m.label.slice(0, 3)}
          </Text>
        </View>
      ))}
    </View>
  );
}

function AreaRow({ area, max }: { area: HoursByArea; max: number }) {
  const meta = serviceAreaMeta(area.serviceAreaId);
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
          <Icon name={meta.icon} size={16} color="textSecondary" />
          <Text variant="bodyStrong" numberOfLines={1}>
            {area.serviceAreaName}
          </Text>
        </View>
        <Text variant="mono" color="textSecondary">
          {area.hours}h
        </Text>
      </View>
      <ProgressBar value={area.hours / max} />
      <Text variant="caption" color="textTertiary">
        {area.shifts} {area.shifts === 1 ? 'shift' : 'shifts'}
        {area.meals > 0 ? ` · ${area.meals} meals` : ''}
      </Text>
    </View>
  );
}

export default function HoursScreen() {
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: qk.hours,
    queryFn: getVolunteerHoursData,
  });

  const maxAreaHours = Math.max(...(data?.byServiceArea.map((a) => a.hours) ?? [1]), 1);

  return (
    <Screen onRefresh={refetch} refreshing={isRefetching}>
      <PageHeader overline="Tō mahi" title="Your hours" subtitle="Every hour is aroha in action." />

      {isLoading || !data ? (
        <View style={{ gap: Spacing.lg }}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : data.totalShifts === 0 ? (
        <EmptyState
          icon="time-outline"
          illustration="heart"
          tone="brand"
          title="No hours just yet"
          message="Your hours will appear here after your first shift."
        />
      ) : (
        <>
          {/* Hero */}
          <Card elevated style={{ gap: Spacing.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
              <IconChip icon="time" tone="brand" size={56} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="statLg">{data.totalHours}</Text>
                <Text variant="caption" color="textSecondary">
                  volunteer hours all up
                </Text>
                {data.hoursThisMonth > 0 ? (
                  <Text variant="caption" color="success" weight="bold">
                    +{data.hoursThisMonth} this month
                  </Text>
                ) : null}
              </View>
            </View>
            <Divider />
            <View style={{ flexDirection: 'row', gap: Spacing.lg }}>
              <View style={{ flex: 1 }}>
                <Stat value={`${data.totalShifts}`} label="shifts shared" />
              </View>
              <View style={{ flex: 1 }}>
                <Stat value={data.totalMeals.toLocaleString()} label="plates of kai" />
              </View>
            </View>
          </Card>

          {/* Milestones */}
          <Card>
            <MilestoneProgress milestones={data.milestones} totalHours={data.totalHours} />
          </Card>

          {/* By area */}
          {data.byServiceArea.length > 0 ? (
            <View style={{ gap: Spacing.md }}>
              <SectionHeader overline="Ngā wāhanga" title="By area" />
              <Card style={{ gap: Spacing.lg }}>
                {data.byServiceArea.map((area) => (
                  <AreaRow key={area.serviceAreaId} area={area} max={maxAreaHours} />
                ))}
              </Card>
            </View>
          ) : null}

          {/* By month */}
          {data.byMonth.length > 0 ? (
            <View style={{ gap: Spacing.md }}>
              <SectionHeader overline="Ia marama" title="Month by month" />
              <Card>
                <MonthBars data={data.byMonth} />
              </Card>
            </View>
          ) : null}
        </>
      )}
    </Screen>
  );
}
