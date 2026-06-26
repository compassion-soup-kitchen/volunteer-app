import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { NextShiftCard } from '@/components/next-shift-card';
import { ShiftCard } from '@/components/shift-card';
import { MilestoneProgress } from '@/components/milestone-progress';
import {
  Avatar,
  Badge,
  Card,
  Divider,
  EmptyState,
  IconChip,
  PageHeader,
  Screen,
  SectionHeader,
  SkeletonCard,
  Stat,
  Text,
} from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { formatLongDate, formatTimeRange, relativeDay } from '@/lib/format';
import { qk } from '@/lib/query-keys';
import { useAuth } from '@/providers/auth-provider';
import { getDashboardData } from '@/services/dashboard-service';
import { getAvailableTraining } from '@/services/training-service';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Ata mārie';
  if (h < 18) return 'Kia ora';
  return 'Pō mārie';
}

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const firstName = (user?.name ?? 'there').split(' ')[0];
  const todayIso = new Date().toISOString().slice(0, 10);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: qk.dashboard,
    queryFn: getDashboardData,
  });
  const { data: training } = useQuery({ queryKey: qk.training, queryFn: getAvailableTraining });

  const nextTraining = training?.find((t) => t.userAttendanceStatus === 'REGISTERED') ?? null;
  const alsoComingUp = data?.upcomingShifts.slice(1) ?? [];

  return (
    <Screen onRefresh={refetch} refreshing={isRefetching}>
      <PageHeader
        overline={greeting()}
        title={`Kia ora, ${firstName}`}
        subtitle={formatLongDate(todayIso)}
        right={<Avatar name={user?.name ?? 'Volunteer'} />}
      />

      {isLoading || !data ? (
        <View style={{ gap: Spacing.lg }}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : (
        <>
          {/* Next shift */}
          {data.nextShift ? (
            <NextShiftCard
              shift={data.nextShift}
              onPress={() => router.push({ pathname: '/shift/[id]', params: { id: data.nextShift!.id } })}
            />
          ) : (
            <Card>
              <EmptyState
                icon="calendar-outline"
                tone="brand"
                title="No shift on the horizon"
                message="Browse the roster and find a time that suits you."
                actionLabel="Browse shifts"
                onAction={() => router.push('/shifts')}
              />
            </Card>
          )}

          {alsoComingUp.length > 0 ? (
            <View style={{ gap: Spacing.md }}>
              <Text variant="label" color="textSecondary">
                Also coming up
              </Text>
              {alsoComingUp.map((s) => (
                <ShiftCard
                  key={s.id}
                  areaId={s.serviceArea.id}
                  areaName={s.serviceArea.name}
                  date={s.date}
                  startTime={s.startTime}
                  endTime={s.endTime}
                  badge={{ label: 'Signed up', tone: 'success', icon: 'checkmark' }}
                  onPress={() => router.push({ pathname: '/shift/[id]', params: { id: s.id } })}
                />
              ))}
            </View>
          ) : null}

          {/* Open shifts for you */}
          {data.openShiftsForYou.length > 0 ? (
            <View style={{ gap: Spacing.md }}>
              <SectionHeader
                overline="Hei āwhina mai"
                title="Shifts you can fill"
                actionLabel="All shifts"
                onAction={() => router.push('/shifts')}
              />
              {data.openShiftsForYou.map((s) => (
                <ShiftCard
                  key={s.id}
                  areaId={s.serviceArea.id}
                  areaName={s.serviceArea.name}
                  date={s.date}
                  startTime={s.startTime}
                  endTime={s.endTime}
                  badge={{ label: `${s.spotsLeft} ${s.spotsLeft === 1 ? 'spot' : 'spots'} left`, tone: 'brand' }}
                  onPress={() => router.push({ pathname: '/shift/[id]', params: { id: s.id } })}
                />
              ))}
            </View>
          ) : null}

          {/* Impact */}
          <View style={{ gap: Spacing.md }}>
            <SectionHeader overline="Tō mahi" title="Your impact" />
            <Card style={{ gap: Spacing.lg }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
                <IconChip icon="restaurant" tone="brand" size={52} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="statLg">{data.totalMeals.toLocaleString()}</Text>
                  <Text variant="caption" color="textSecondary">
                    plates of kai shared on your shifts
                  </Text>
                  {data.mealsThisMonth > 0 ? (
                    <Text variant="caption" color="success" style={{ fontWeight: '700' }}>
                      +{data.mealsThisMonth} this month
                    </Text>
                  ) : null}
                </View>
              </View>

              <Divider />

              <View style={{ flexDirection: 'row', gap: Spacing.lg }}>
                <View style={{ flex: 1 }}>
                  <Stat
                    value={`${data.totalHours}`}
                    label="volunteer hours"
                    caption={data.hoursThisMonth > 0 ? `+${data.hoursThisMonth} this month` : undefined}
                    captionTone="success"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Stat value={`${data.totalShifts}`} label="shifts shared" />
                </View>
              </View>

              <Divider />

              <MilestoneProgress milestones={data.milestones} totalHours={data.totalHours} />
            </Card>
          </View>

          {/* Training reminder */}
          {nextTraining ? (
            <View style={{ gap: Spacing.md }}>
              <SectionHeader
                overline="Ako"
                title="Training ahead"
                actionLabel="All training"
                onAction={() => router.push('/training')}
              />
              <Card onPress={() => router.push('/training')} style={{ gap: Spacing.md }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
                  <IconChip icon="school" tone="navy" size={44} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text variant="subheading" numberOfLines={1}>
                      {nextTraining.title}
                    </Text>
                    <Text variant="caption" color="textSecondary">
                      {relativeDay(nextTraining.date)} · {formatTimeRange(nextTraining.startTime, nextTraining.endTime)}
                    </Text>
                  </View>
                  <Badge label="Registered" tone="navy" icon="checkmark" />
                </View>
              </Card>
            </View>
          ) : null}
        </>
      )}
    </Screen>
  );
}
