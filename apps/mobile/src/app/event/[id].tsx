import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RsvpControl } from '@/components/rsvp-control';
import { Badge, EmptyState, Icon, type IconName, Text } from '@/components/ui';
import { Layout, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { canReply, formatRsvpTally, RSVP_CONFIRMATIONS, rsvpClosedMessage } from '@/lib/events';
import { formatLongDate, formatTime, formatTimeRange } from '@/lib/format';
import { qk } from '@/lib/query-keys';
import { getEventById } from '@/services/events-service';

function FactRow({ icon, value }: { icon: IconName; value: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
      <Icon name={icon} size={19} color="primary" />
      <Text variant="callout" color="text" style={{ flex: 1 }}>
        {value}
      </Text>
    </View>
  );
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const { data: event, isLoading } = useQuery({
    queryKey: qk.event(id),
    queryFn: () => getEventById(id),
  });

  // A fixed height keeps the fit-to-contents sheet from collapsing while we wait.
  if (isLoading) {
    return (
      <View
        style={{
          height: 280,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.background,
        }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={{ minHeight: 320, backgroundColor: colors.background, justifyContent: 'center' }}>
        <EmptyState
          icon="calendar-outline"
          illustration="korero"
          title="Event not found"
          message="This event may have been taken down."
        />
      </View>
    );
  }

  const cancelled = event.status === 'CANCELLED';
  const times = event.startTime
    ? event.endTime
      ? formatTimeRange(event.startTime, event.endTime)
      : `From ${formatTime(event.startTime)}`
    : null;
  const closed = rsvpClosedMessage(event);

  return (
    <View
      style={{
        backgroundColor: colors.background,
        paddingHorizontal: Layout.screenPadding,
        paddingTop: Spacing.xxxl,
        paddingBottom: insets.bottom + Spacing.xxl,
      }}>
      <View style={{ width: '100%', maxWidth: Layout.maxContentWidth, alignSelf: 'center', gap: Spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' }}>
          {cancelled ? (
            <Badge label="Cancelled" tone="neutral" icon="close-circle-outline" />
          ) : (
            <Badge label="You're invited" tone="brand" icon="calendar-outline" />
          )}
          {event.myResponse && !cancelled ? (
            <Badge
              label={RSVP_CONFIRMATIONS[event.myResponse]}
              tone={
                event.myResponse === 'GOING'
                  ? 'success'
                  : event.myResponse === 'MAYBE'
                    ? 'warning'
                    : 'neutral'
              }
            />
          ) : null}
        </View>

        <Text variant="display">{event.title}</Text>

        <View style={{ gap: Spacing.md }}>
          <FactRow icon="calendar-outline" value={formatLongDate(event.date)} />
          {times ? <FactRow icon="time-outline" value={times} /> : null}
          {event.location ? <FactRow icon="location-outline" value={event.location} /> : null}
          {event.rsvpEnabled && !cancelled ? (
            <FactRow icon="people-outline" value={formatRsvpTally(event)} />
          ) : null}
        </View>

        {event.description ? (
          <Text variant="body" color="text" style={{ lineHeight: 26 }}>
            {event.description}
          </Text>
        ) : null}

        {cancelled ? (
          <Text variant="caption" color="textSecondary">
            This one isn&apos;t going ahead. Sorry for the change of plan.
          </Text>
        ) : canReply(event) ? (
          <View style={{ gap: Spacing.sm }}>
            <Text variant="label">Can you come?</Text>
            {event.rsvpDeadline ? (
              <Text variant="caption" color="textTertiary">
                Please reply by {formatLongDate(event.rsvpDeadline)}.
              </Text>
            ) : null}
            <RsvpControl event={event} />
          </View>
        ) : closed ? (
          <Text variant="caption" color="textTertiary">
            {closed}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
