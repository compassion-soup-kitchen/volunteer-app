import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Fragment } from 'react';
import { Linking, Platform, Pressable, View } from 'react-native';

import { AnnouncementCard } from '@/components/announcement-card';
import { Wordmark } from '@/components/brand';
import { MilestoneProgress } from '@/components/milestone-progress';
import { MissionQuote } from '@/components/mission-quote';
import { NextShiftHero } from '@/components/next-shift-hero';
import { ShiftCard } from '@/components/shift-card';
import { StatStrip } from '@/components/stat-strip';
import {
  Badge,
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
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { countdownLabel, formatTimeRange, relativeDay } from '@/lib/format';
import { qk } from '@/lib/query-keys';
import { useAuth } from '@/providers/auth-provider';
import { getAnnouncements } from '@/services/announcements-service';
import { getDashboardData } from '@/services/dashboard-service';
import { getAvailableTraining } from '@/services/training-service';
import type { RosterShift } from '@/types/models';

/** Where shifts happen — used for the hero location line and the directions link. */
const VENUE = 'Compassion Soup Kitchen · Tory St, Te Aro';
const VENUE_QUERY = 'Compassion Soup Kitchen, Tory Street, Wellington';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Ata mārie';
  if (h < 18) return 'Kia ora';
  return 'Pō mārie';
}

/** A situational one-liner that reflects the volunteer's actual roster state. */
function statusLine(next: RosterShift | null): string {
  if (!next) return "You're free this week — find a time to lend a hand.";
  const { label } = countdownLabel(next.date);
  if (label === 'Today') return "You're on today — ka rawe!";
  if (label === 'Tomorrow') return "You're rostered on tomorrow.";
  return `You're rostered on ${relativeDay(next.date)}.`;
}

function openDirections() {
  const q = encodeURIComponent(VENUE_QUERY);
  const url = Platform.select({
    ios: `http://maps.apple.com/?q=${q}`,
    default: `https://www.google.com/maps/search/?api=1&query=${q}`,
  });
  if (url) void Linking.openURL(url);
}

/** Compact brand lockup with a notification bell that opens the notices feed. */
function UtilityBar({ hasUnread, onNotices }: { hasUnread: boolean; onNotices: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Wordmark height={24} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Notices"
        onPress={onNotices}
        hitSlop={10}
        style={({ pressed }) => ({ opacity: pressed ? 0.55 : 1, padding: 2 })}>
        <Icon name="notifications-outline" size={23} color="textSecondary" />
        {hasUnread ? (
          <View
            style={{
              position: 'absolute',
              top: 1,
              right: 1,
              width: 9,
              height: 9,
              borderRadius: 999,
              backgroundColor: colors.primary,
              borderWidth: 1.5,
              borderColor: colors.background,
            }}
          />
        ) : null}
      </Pressable>
    </View>
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
  const { data: announcements } = useQuery({ queryKey: qk.announcements, queryFn: getAnnouncements });

  const nextTraining = training?.find((t) => t.userAttendanceStatus === 'REGISTERED') ?? null;
  const rosterOverflow = data ? Math.max(0, data.upcomingShifts.length - 1) : 0;
  const notices = announcements ?? [];
  const topNotices = notices.slice(0, 2);

  return (
    <Screen onRefresh={refetch} refreshing={isRefetching}>
      <UtilityBar hasUnread={notices.length > 0} onNotices={() => router.push('/news')} />

      {/* Greeting — personal, situational, leads the page */}
      <View style={{ gap: 4 }}>
        <Text variant="overline" color="primary">
          {greeting()}
        </Text>
        <Text variant="display">Kia ora, {firstName}</Text>
        <Text variant="body" color="textSecondary">
          {statusLine(data?.nextShift ?? null)}
        </Text>
      </View>

      {isLoading || !data ? (
        <View style={{ gap: Spacing.lg }}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : (
        <>
          {/* HERO — the one thing they came to see */}
          {data.nextShift ? (
            <NextShiftHero
              shift={data.nextShift}
              location={VENUE}
              extraCount={rosterOverflow}
              onDetails={() => router.push({ pathname: '/shift/[id]', params: { id: data.nextShift!.id } })}
              onDirections={openDirections}
              onMore={() => router.push('/schedule')}
            />
          ) : (
            <Card elevated>
              <EmptyState
                icon="calendar-outline"
                illustration="give"
                tone="brand"
                title="No shift on the horizon"
                message="Browse the roster and find a time that suits you — every hand makes a difference."
                actionLabel="Browse shifts"
                onAction={() => router.push('/shifts')}
              />
            </Card>
          )}

          {/* Reminders — booked training surfaced as an action */}
          {nextTraining ? (
            <View style={{ gap: Spacing.md }}>
              <SectionHeader overline="He maumahara" title="Don't forget" />
              <Card
                onPress={() => router.push('/training')}
                style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
                <IconChip icon="school" tone="navy" size={44} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="subheading" numberOfLines={1}>
                    {nextTraining.title}
                  </Text>
                  <Text variant="caption" color="textSecondary">
                    {relativeDay(nextTraining.date)} · {formatTimeRange(nextTraining.startTime, nextTraining.endTime)}
                  </Text>
                </View>
                <Badge label="Booked" tone="navy" icon="checkmark" />
              </Card>
            </View>
          ) : null}

          {/* Pānui — team notices: the operational heartbeat */}
          {topNotices.length > 0 ? (
            <View style={{ gap: Spacing.md }}>
              <SectionHeader
                overline="Pānui"
                title="Notices"
                divider
                actionLabel={notices.length > topNotices.length ? 'All notices' : undefined}
                onAction={notices.length > topNotices.length ? () => router.push('/news') : undefined}
              />
              {topNotices.map((item) => (
                <AnnouncementCard key={item.id} item={item} onPress={() => router.push('/news')} />
              ))}
            </View>
          ) : null}

          {/* Shifts you can fill — interest-matched opportunities */}
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
                    badge={{
                      label: `${s.spotsLeft} ${s.spotsLeft === 1 ? 'spot' : 'spots'} left`,
                      tone: s.spotsLeft <= 2 ? 'warning' : 'brand',
                    }}
                    onPress={() => router.push({ pathname: '/shift/[id]', params: { id: s.id } })}
                  />
                </Fragment>
              ))}
            </View>
          ) : null}

          {/* Your contribution — recognition, links through to Hours */}
          <View style={{ gap: Spacing.md }}>
            <SectionHeader
              overline="Tō takoha"
              title="Your contribution"
              divider
              actionLabel="Details"
              onAction={() => router.push('/hours')}
            />
            <StatStrip
              items={[
                { value: `${data.totalHours}`, label: 'Hours' },
                { value: data.totalMeals.toLocaleString(), label: 'Meals' },
                { value: `${data.totalShifts}`, label: 'Shifts' },
              ]}
            />
            <Card>
              <MilestoneProgress milestones={data.milestones} totalHours={data.totalHours} />
            </Card>
          </View>

          {/* Kaupapa — closing grace note */}
          <MissionQuote />
        </>
      )}
    </Screen>
  );
}
