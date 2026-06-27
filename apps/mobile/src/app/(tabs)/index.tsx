import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Fragment } from 'react';
import { View } from 'react-native';

import { Wordmark } from '@/components/brand';
import { NextShiftCard } from '@/components/next-shift-card';
import { ShiftCard } from '@/components/shift-card';
import { StatStrip } from '@/components/stat-strip';
import {
  Badge,
  Button,
  Card,
  Divider,
  EmptyState,
  Icon,
  IconChip,
  Screen,
  SectionHeader,
  SkeletonCard,
  Text,
} from '@/components/ui';
import { FontFamily, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatTimeRange, relativeDay } from '@/lib/format';
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

/** Compact brand lockup + notification bell, sitting above the editorial hero. */
function BrandBar() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Wordmark height={24} />
      <Icon name="notifications-outline" size={22} color="textSecondary" />
    </View>
  );
}

/** Suzanne Aubert's founding kaupapa, set on a dark "photo" panel. */
function QuoteHero() {
  const { colors } = useTheme();
  return (
    <Card tone="ink" elevated padding={Spacing.xl} style={{ gap: Spacing.lg }}>
      <Text style={{ fontFamily: FontFamily.serifItalic, fontSize: 19, lineHeight: 27, color: colors.onInk }}>
        &ldquo;Help one another and make use of the many little occasions to lighten the burden of others.&rdquo;
      </Text>
      <Text variant="overline" style={{ color: colors.onInkMuted }}>
        Suzanne Aubert
      </Text>
    </Card>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const firstName = (user?.name ?? 'there').split(' ')[0];

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: qk.dashboard,
    queryFn: getDashboardData,
  });
  const { data: training } = useQuery({ queryKey: qk.training, queryFn: getAvailableTraining });

  const nextTraining = training?.find((t) => t.userAttendanceStatus === 'REGISTERED') ?? null;
  const alsoComingUp = data?.upcomingShifts.slice(1) ?? [];

  return (
    <Screen onRefresh={refetch} refreshing={isRefetching}>
      <BrandBar />
      <QuoteHero />

      <View style={{ gap: 4 }}>
        <Text variant="overline" color="primary">
          {greeting()}
        </Text>
        <Text variant="display">Kia ora, {firstName}</Text>
        <Text variant="body" color="textSecondary">
          {data?.nextShift ? 'Your next shift is coming up.' : 'Find a time to lend a hand.'}
        </Text>
      </View>

      {isLoading || !data ? (
        <View style={{ gap: Spacing.lg }}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : (
        <>
          {data.nextShift ? (
            <NextShiftCard
              shift={data.nextShift}
              onPress={() => router.push({ pathname: '/shift/[id]', params: { id: data.nextShift!.id } })}
            />
          ) : (
            <Card elevated>
              <EmptyState
                icon="calendar-outline"
                illustration="give"
                tone="brand"
                title="No shift on the horizon"
                message="Browse the roster and find a time that suits you."
                actionLabel="Browse shifts"
                onAction={() => router.push('/shifts')}
              />
            </Card>
          )}

          {/* Mission-forward summary */}
          <StatStrip
            items={[
              { value: `${data.totalHours}`, label: 'Hours' },
              { value: data.totalMeals.toLocaleString(), label: 'Meals' },
              { value: `${data.totalShifts}`, label: 'Shifts' },
            ]}
          />

          <Button title="Browse shifts" icon="arrow-forward" onPress={() => router.push('/shifts')} />

          {alsoComingUp.length > 0 ? (
            <View style={{ gap: Spacing.md }}>
              <SectionHeader overline="Kei te heke mai" title="Also coming up" divider />
              {alsoComingUp.map((s, i) => (
                <Fragment key={s.id}>
                  {i > 0 ? <Divider /> : null}
                  <ShiftCard
                    areaId={s.serviceArea.id}
                    areaName={s.serviceArea.name}
                    date={s.date}
                    startTime={s.startTime}
                    endTime={s.endTime}
                    badge={{ label: 'Signed up', tone: 'success', icon: 'checkmark' }}
                    onPress={() => router.push({ pathname: '/shift/[id]', params: { id: s.id } })}
                  />
                </Fragment>
              ))}
            </View>
          ) : null}

          {/* Open shifts for you */}
          {data.openShiftsForYou.length > 0 ? (
            <View style={{ gap: Spacing.md }}>
              <SectionHeader
                overline="Hei āwhina mai"
                title="Shifts you can fill"
                divider
                actionLabel="All shifts"
                onAction={() => router.push('/shifts')}
              />
              {data.openShiftsForYou.map((s, i) => (
                <Fragment key={s.id}>
                  {i > 0 ? <Divider /> : null}
                  <ShiftCard
                    areaId={s.serviceArea.id}
                    areaName={s.serviceArea.name}
                    date={s.date}
                    startTime={s.startTime}
                    endTime={s.endTime}
                    badge={{ label: `${s.spotsLeft} ${s.spotsLeft === 1 ? 'spot' : 'spots'} left`, tone: 'brand' }}
                    onPress={() => router.push({ pathname: '/shift/[id]', params: { id: s.id } })}
                  />
                </Fragment>
              ))}
            </View>
          ) : null}

          {/* Training reminder */}
          {nextTraining ? (
            <View style={{ gap: Spacing.md }}>
              <SectionHeader
                overline="Ako"
                title="Training ahead"
                divider
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
