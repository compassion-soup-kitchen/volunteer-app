import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Fragment } from 'react';
import { Linking, Platform, Pressable, View } from 'react-native';

import { AnnouncementCard } from '@/components/announcement-card';
import { Wordmark } from '@/components/brand';
import { HomeVideoHeader } from '@/components/home-video-header';
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
import { formatTimeRange, relativeDay } from '@/lib/format';
import { qk } from '@/lib/query-keys';
import { useAuth } from '@/providers/auth-provider';
import { getAnnouncements } from '@/services/announcements-service';
import { getDashboardData } from '@/services/dashboard-service';
import { getAvailableTraining } from '@/services/training-service';

/** Where shifts happen — used for the hero location line and the directions link. */
const VENUE = 'Compassion Soup Kitchen · Tory St, Te Aro';
const VENUE_QUERY = 'Compassion Soup Kitchen, Tory Street, Wellington';

/**
 * Soft drop shadow so light greeting text stays legible over the moving footage.
 * iOS clips a text shadow to the glyph box, so the padding gives the 12px blur
 * room to render and the matching negative margin keeps the text in place.
 */
const HERO_SHADOW = {
  textShadowColor: 'rgba(0,0,0,0.5)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 12,
  paddingHorizontal: 14,
  marginHorizontal: -14,
  paddingVertical: 14,
  marginVertical: -10,
} as const;
const ON_VIDEO = '#FFFFFF';
const ON_VIDEO_DIM = 'rgba(255,255,255,0.82)';

/** Time-of-day Te Reo greeting — kept distinct from the "Kia ora, {name}" headline. */
function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Mōrena'; // good morning
  if (h < 18) return 'Ahiahi mārie'; // good afternoon
  return 'Pō mārie'; // good evening
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
function UtilityBar({
  hasUnread,
  onNotices,
  onVideo = false,
}: {
  hasUnread: boolean;
  onNotices: () => void;
  /** Light treatment for sitting over the video header */
  onVideo?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Wordmark height={24} color={onVideo ? 'primaryForeground' : 'text'} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Notices"
        onPress={onNotices}
        hitSlop={10}
        style={({ pressed }) => ({ opacity: pressed ? 0.55 : 1, padding: 2 })}>
        <Icon
          name="notifications-outline"
          size={23}
          color={onVideo ? undefined : 'textSecondary'}
          raw={onVideo ? ON_VIDEO_DIM : undefined}
        />
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
              borderColor: onVideo ? 'rgba(16,14,10,0.6)' : colors.background,
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
    <Screen
      onRefresh={refetch}
      refreshing={isRefetching}
      header={
        <HomeVideoHeader>
          <UtilityBar onVideo hasUnread={notices.length > 0} onNotices={() => router.push('/news')} />

          {/* Greeting — personal, floating on the footage */}
          <View>
            <Text variant="overline" style={{ color: ON_VIDEO_DIM, ...HERO_SHADOW }}>
              {greeting()}
            </Text>
            <Text variant="display" style={{ color: ON_VIDEO, ...HERO_SHADOW }}>
              Kia ora, {firstName}
            </Text>
          </View>
        </HomeVideoHeader>
      }>
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
