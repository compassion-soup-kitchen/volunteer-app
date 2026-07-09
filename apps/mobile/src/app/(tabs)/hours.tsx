import { useQuery } from '@tanstack/react-query';
import { View } from 'react-native';

import { AreaLedger, ImpactTrend, MilestoneJourney } from '@/components/impact';
import {
  Card,
  EmptyState,
  Icon,
  IconChip,
  PageHeader,
  Screen,
  SectionHeader,
  SkeletonCard,
  Text,
} from '@/components/ui';
import { type IconName } from '@/components/ui/icon';
import { type Tone } from '@/components/ui/tones';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDuration } from '@/lib/format';
import { qk } from '@/lib/query-keys';
import { useAuth } from '@/providers/auth-provider';
import { getVolunteerHoursData } from '@/services/hours-service';

/** A translucent momentum pill on the dark hero — surfaces this month's mahi. */
function MomentumPill({ label }: { label: string }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: Radius.pill,
        backgroundColor: 'rgba(255,255,255,0.14)',
      }}>
      <Icon name="caret-up" size={12} raw={colors.onInk} />
      <Text variant="caption" weight="bold" style={{ color: colors.onInk }}>
        {label}
      </Text>
    </View>
  );
}

/** One mission-outcome figure (meals / shifts) with a this-month delta. */
function OutcomeCard({
  icon,
  tone,
  value,
  label,
  thisMonth,
  unit,
}: {
  icon: IconName;
  tone: Tone;
  value: string;
  label: string;
  thisMonth: number;
  unit: string;
}) {
  return (
    <Card style={{ flex: 1, gap: Spacing.md }}>
      <IconChip icon={icon} tone={tone} size={36} />
      <View style={{ gap: 2 }}>
        <Text variant="stat">{value}</Text>
        <Text variant="caption" color="textSecondary">
          {label}
        </Text>
      </View>
      {thisMonth > 0 ? (
        <Text variant="caption" color="success" weight="bold">
          +{thisMonth.toLocaleString()} {unit} this month
        </Text>
      ) : (
        <Text variant="caption" color="textTertiary">
          None yet this month
        </Text>
      )}
    </Card>
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

  return (
    <Screen onRefresh={refetch} refreshing={isRefetching} insetTop={false}>
      <PageHeader
        overline="Tō pānga"
        title="Your impact"
        subtitle="The mahi you've given, and the good it's done."
        illustration="heart"
      />

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
          {/* HERO — lifetime time given, with this-month momentum */}
          <Card tone="ink" elevated padding={Spacing.xl} style={{ overflow: 'hidden', gap: Spacing.md }}>
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
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.md }}>
              <Text variant="overline" style={{ color: colors.onInkMuted, letterSpacing: 1.4 }}>
                Tō wā · Time given
              </Text>
              {data.hoursThisMonth > 0 ? <MomentumPill label={`${formatDuration(data.hoursThisMonth)} this month`} /> : null}
            </View>
            <Text
              style={{
                fontFamily: FontFamily.serif,
                fontSize: 52,
                lineHeight: 56,
                letterSpacing: -0.6,
                color: colors.onInk,
              }}>
              {data.totalHours}
              <Text style={{ fontFamily: FontFamily.serif, fontSize: 22, color: colors.onInkMuted }}> hrs</Text>
            </Text>
            <Text variant="caption" style={{ color: colors.onInkMuted }}>
              Across {data.totalShifts} {data.totalShifts === 1 ? 'shift' : 'shifts'} since you joined
            </Text>
          </Card>

          {/* JOURNEY — promoted high; the motivational spine */}
          <MilestoneJourney milestones={data.milestones} totalHours={data.totalHours} />

          {/* OUTCOMES — what the time produced */}
          <View style={{ flexDirection: 'row', gap: Spacing.md }}>
            <OutcomeCard
              icon="restaurant"
              tone="brand"
              value={data.totalMeals.toLocaleString()}
              label="Meals served"
              thisMonth={data.mealsThisMonth}
              unit="meals"
            />
            <OutcomeCard
              icon="checkmark-circle"
              tone="navy"
              value={`${data.totalShifts}`}
              label="Shifts done"
              thisMonth={data.shiftsThisMonth}
              unit={data.shiftsThisMonth === 1 ? 'shift' : 'shifts'}
            />
          </View>

          {/* TREND — monthly rhythm */}
          {data.byMonth.length > 1 ? <ImpactTrend data={data.byMonth} /> : null}

          {/* BREAKDOWN — where the time goes */}
          {data.byServiceArea.length > 0 ? (
            <View style={{ gap: Spacing.md }}>
              <SectionHeader overline="Ngā wāhanga" title="Where your time goes" />
              <AreaLedger areas={data.byServiceArea} totalHours={data.totalHours} />
            </View>
          ) : null}

          {/* GRATITUDE — a warm close */}
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
        </>
      )}
    </Screen>
  );
}
