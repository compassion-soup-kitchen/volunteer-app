import { View } from 'react-native';

import { Badge, Card, Icon, Text } from '@/components/ui';
import { RsvpControl } from '@/components/rsvp-control';
import { Spacing } from '@/constants/theme';
import { formatLongDate, formatTimeRange, formatTime } from '@/lib/format';
import { canReply, formatRsvpTally, RSVP_CONFIRMATIONS } from '@/lib/events';
import type { VolunteerEvent } from '@/types/models';

function Fact({ icon, value }: { icon: 'calendar-outline' | 'time-outline' | 'location-outline' | 'people-outline'; value: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
      <Icon name={icon} size={15} color="textTertiary" />
      <Text variant="caption" color="textSecondary" style={{ flex: 1 }}>
        {value}
      </Text>
    </View>
  );
}

export type EventCardProps = {
  event: VolunteerEvent;
  onPress?: () => void;
  /** Offer the reply right here rather than only in the detail sheet. */
  withRsvp?: boolean;
};

/**
 * An invitation card: what it is, when and where, who's coming — and the reply.
 *
 * Replying in place is deliberate: an invitation you have to open first is an
 * invitation half the whānau never answers.
 */
export function EventCard({ event, onPress, withRsvp = true }: EventCardProps) {
  const cancelled = event.status === 'CANCELLED';
  const times = event.startTime
    ? event.endTime
      ? formatTimeRange(event.startTime, event.endTime)
      : `From ${formatTime(event.startTime)}`
    : null;

  return (
    <Card onPress={onPress} style={{ gap: Spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' }}>
        {cancelled ? (
          <Badge label="Cancelled" tone="neutral" icon="close-circle-outline" />
        ) : (
          <Badge label="You're invited" tone="brand" icon="calendar-outline" />
        )}
        {event.myResponse && !cancelled ? (
          <Badge
            label={RSVP_CONFIRMATIONS[event.myResponse]}
            tone={event.myResponse === 'GOING' ? 'success' : event.myResponse === 'MAYBE' ? 'warning' : 'neutral'}
          />
        ) : null}
      </View>

      <View style={{ gap: 4 }}>
        <Text variant="subheading">{event.title}</Text>
        {event.description ? (
          <Text variant="body" color="textSecondary" numberOfLines={onPress ? 3 : undefined}>
            {event.description}
          </Text>
        ) : null}
      </View>

      <View style={{ gap: 6 }}>
        <Fact icon="calendar-outline" value={formatLongDate(event.date)} />
        {times ? <Fact icon="time-outline" value={times} /> : null}
        {event.location ? <Fact icon="location-outline" value={event.location} /> : null}
        {event.rsvpEnabled && !cancelled ? (
          <Fact icon="people-outline" value={formatRsvpTally(event)} />
        ) : null}
      </View>

      {cancelled ? (
        <Text variant="caption" color="textSecondary">
          This one isn&apos;t going ahead. Sorry for the change of plan.
        </Text>
      ) : withRsvp && canReply(event) ? (
        <View style={{ gap: Spacing.sm }}>
          <Text variant="label">Can you come?</Text>
          <RsvpControl event={event} showNote={false} />
        </View>
      ) : null}
    </Card>
  );
}
