import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { EventCard } from '@/components/event-card';
import { Card, EmptyState, Screen, SectionHeader, SkeletonCard, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { formatShiftDate } from '@/lib/format';
import { qk } from '@/lib/query-keys';
import { getPastEvents, getUpcomingEvents } from '@/services/events-service';

export default function EventsScreen() {
  const router = useRouter();

  const upcoming = useQuery({ queryKey: qk.events, queryFn: getUpcomingEvents });
  const past = useQuery({ queryKey: qk.pastEvents, queryFn: getPastEvents });

  const invitations = upcoming.data ?? [];
  const been = past.data ?? [];

  return (
    <Screen
      onRefresh={() => {
        upcoming.refetch();
        past.refetch();
      }}
      refreshing={upcoming.isRefetching}
      insetTop={false}>
      <View style={{ gap: 4 }}>
        <Text variant="overline" color="primary">
          Ngā hui
        </Text>
        <Text variant="display">Come along</Text>
        <Text variant="body" color="textSecondary">
          Parties, hui and get-togethers for the whānau.
        </Text>
      </View>

      {upcoming.isLoading ? (
        <View style={{ gap: Spacing.md }}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : invitations.length === 0 ? (
        <EmptyState
          icon="calendar-outline"
          illustration="korero"
          tone="brand"
          title="Nothing in the diary"
          message="When the team plans a gathering, your invitation will show up here."
        />
      ) : (
        <View style={{ gap: Spacing.md }}>
          {invitations.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onPress={() => router.push(`/event/${event.id}`)}
            />
          ))}
        </View>
      )}

      {been.length > 0 ? (
        <View style={{ gap: Spacing.md }}>
          <SectionHeader overline="Kua oti" title="Been and gone" />
          <Card padding={0}>
            {been.map((event, index) => (
              <View
                key={event.id}
                style={{
                  paddingHorizontal: Spacing.lg,
                  paddingVertical: Spacing.md,
                  gap: 2,
                  borderTopWidth: index === 0 ? 0 : 1,
                  borderTopColor: 'transparent',
                }}>
                <Text variant="callout">{event.title}</Text>
                <Text variant="caption" color="textTertiary">
                  {formatShiftDate(event.date)}
                  {event.status === 'CANCELLED'
                    ? ' · Cancelled'
                    : event.myResponse === 'GOING'
                      ? ' · You were there'
                      : ` · ${event.goingCount} came along`}
                </Text>
              </View>
            ))}
          </Card>
        </View>
      ) : null}
    </Screen>
  );
}
