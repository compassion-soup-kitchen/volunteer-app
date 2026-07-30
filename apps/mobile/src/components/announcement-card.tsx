import { View } from 'react-native';

import { RsvpControl } from '@/components/rsvp-control';
import { Avatar, Badge, Card, Icon, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { canReply, formatRsvpTally } from '@/lib/events';
import { formatLongDate, formatRelativeTime } from '@/lib/format';
import type { Announcement } from '@/types/models';

export type AnnouncementCardProps = {
  item: Announcement;
  onPress?: () => void;
  /** Truncate the body to a 2-line teaser (feed) vs show it in full (notices screen). */
  compact?: boolean;
};

/**
 * A single team pānui. Pinned notices wear a brand-red rail and an "Important"
 * tag so time-sensitive asks (e.g. "we need two more for Friday") read as
 * urgent; the rest are quiet "Notice" cards.
 */
export function AnnouncementCard({ item, onPress, compact = true }: AnnouncementCardProps) {
  const { colors } = useTheme();

  return (
    <Card onPress={onPress} padding={0} style={{ flexDirection: 'row', alignItems: 'stretch', overflow: 'hidden' }}>
      {item.pinned ? <View style={{ width: 4, backgroundColor: colors.primary }} /> : null}
      <View style={{ flex: 1, gap: Spacing.md, padding: Spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
          {item.event ? (
            <Badge label="Invitation" tone="brand" icon="calendar-outline" />
          ) : item.pinned ? (
            <Badge label="Important" tone="brand" icon="alert-circle" />
          ) : (
            <Badge label="Notice" tone="neutral" />
          )}
          <View style={{ flex: 1 }} />
          <Text variant="caption" color="textTertiary">
            {formatRelativeTime(item.publishedAt)}
          </Text>
        </View>

        <Text variant="subheading" numberOfLines={compact ? 2 : undefined}>
          {item.title}
        </Text>
        <Text variant="body" color="textSecondary" numberOfLines={compact ? 2 : undefined}>
          {item.body}
        </Text>

        {/* An event pānui carries its own reply, so nobody has to go looking
            for where to say yes. Compact cards just say when it is. */}
        {item.event ? (
          <View
            style={{
              gap: Spacing.sm,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              paddingTop: Spacing.md,
            }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
              <Icon name="calendar-outline" size={15} color="textTertiary" />
              <Text variant="caption" color="textSecondary" style={{ flex: 1 }}>
                {formatLongDate(item.event.date)}
                {item.event.rsvpEnabled ? ` · ${formatRsvpTally(item.event)}` : ''}
              </Text>
            </View>
            {!compact && canReply(item.event) ? (
              <RsvpControl event={item.event} showNote={false} />
            ) : null}
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
          <Avatar name={item.authorName} size={24} />
          <Text variant="caption" color="textSecondary" style={{ flex: 1 }} numberOfLines={1}>
            {item.authorName}
          </Text>
          {compact && onPress ? <Icon name="chevron-forward" size={16} color="textTertiary" /> : null}
        </View>
      </View>
    </Card>
  );
}
