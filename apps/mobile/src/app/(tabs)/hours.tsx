import { useQuery } from '@tanstack/react-query';
import { View } from 'react-native';

import { serviceAreaMeta } from '@/components/meta';
import { MilestoneProgress } from '@/components/milestone-progress';
import {
  Card,
  EmptyState,
  Icon,
  PageHeader,
  ProgressBar,
  Screen,
  SectionHeader,
  SkeletonCard,
  Text,
} from '@/components/ui';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { qk } from '@/lib/query-keys';
import { useAuth } from '@/providers/auth-provider';
import { getVolunteerHoursData } from '@/services/hours-service';
import type { HoursByArea, HoursByMonth } from '@/types/models';

/** Hours-by-month bars; the most recent month is picked out in brand red. */
function MonthBars({ data }: { data: HoursByMonth[] }) {
  const { colors } = useTheme();
  const max = Math.max(...data.map((m) => m.hours), 1);
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm, height: 84 }}>
        {data.map((m, i) => {
          const current = i === data.length - 1;
          return (
            <View
              key={m.month}
              style={{
                flex: 1,
                height: `${Math.max(6, (m.hours / max) * 100)}%`,
                backgroundColor: current ? colors.primary : colors.surfaceMuted,
                borderTopLeftRadius: Radius.sm,
                borderTopRightRadius: Radius.sm,
              }}
            />
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm }}>
        {data.map((m, i) => (
          <Text
            key={m.month}
            variant="overline"
            center
            color={i === data.length - 1 ? 'primary' : 'textTertiary'}
            style={{ flex: 1, fontSize: 10, letterSpacing: 0.4 }}>
            {m.label.slice(0, 3)}
          </Text>
        ))}
      </View>
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
  const { colors } = useTheme();
  const { user } = useAuth();
  const firstName = (user?.name ?? 'there').split(' ')[0];

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: qk.hours,
    queryFn: getVolunteerHoursData,
  });

  const maxAreaHours = Math.max(...(data?.byServiceArea.map((a) => a.hours) ?? [1]), 1);

  return (
    <Screen onRefresh={refetch} refreshing={isRefetching}>
      <PageHeader overline="Tō pānga" title="Your impact" subtitle="The good you've done." illustration="heart" />

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
          message="Your impact will appear here after your first shift."
        />
      ) : (
        <>
          {/* Time given — dark hero */}
          <Card tone="ink" elevated padding={Spacing.xl} style={{ overflow: 'hidden' }}>
            <View
              style={{
                position: 'absolute',
                right: -30,
                top: -30,
                width: 130,
                height: 130,
                borderRadius: 65,
                backgroundColor: 'rgba(228,0,43,0.22)',
              }}
            />
            <Text variant="overline" style={{ color: colors.onInkMuted, letterSpacing: 1.4 }}>
              Time given
            </Text>
            <Text
              style={{
                fontFamily: FontFamily.serif,
                fontSize: 52,
                lineHeight: 56,
                letterSpacing: -0.6,
                color: colors.onInk,
                marginTop: Spacing.sm,
              }}>
              {data.totalHours}
              <Text style={{ fontFamily: FontFamily.serif, fontSize: 22, color: colors.onInkMuted }}> hrs</Text>
            </Text>
            <Text variant="caption" style={{ color: colors.onInkMuted, marginTop: 6 }}>
              Since you joined
            </Text>
          </Card>

          {/* Meals / shifts */}
          <View style={{ flexDirection: 'row', gap: Spacing.md }}>
            <Card style={{ flex: 1, gap: 6 }}>
              <Text style={{ fontFamily: FontFamily.serif, fontSize: 26, lineHeight: 28, color: colors.text, letterSpacing: -0.3 }}>
                {data.totalMeals.toLocaleString()}
              </Text>
              <Text variant="caption" color="textSecondary">
                Meals served
              </Text>
            </Card>
            <Card style={{ flex: 1, gap: 6 }}>
              <Text style={{ fontFamily: FontFamily.serif, fontSize: 26, lineHeight: 28, color: colors.text, letterSpacing: -0.3 }}>
                {data.totalShifts}
              </Text>
              <Text variant="caption" color="textSecondary">
                Shifts done
              </Text>
            </Card>
          </View>

          {/* Hours by month */}
          {data.byMonth.length > 0 ? (
            <Card style={{ gap: Spacing.lg }}>
              <Text variant="heading">Hours by month</Text>
              <MonthBars data={data.byMonth} />
            </Card>
          ) : null}

          {/* Thank you */}
          <Card
            plain
            padding={Spacing.lg}
            radius={Radius.lg}
            style={{ backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
            <Icon name="heart" size={22} raw={colors.primaryForeground} />
            <Text variant="callout" style={{ flex: 1, color: colors.primaryForeground }}>
              Thank you, {firstName} — your time keeps the kitchen warm.
            </Text>
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
        </>
      )}
    </Screen>
  );
}
