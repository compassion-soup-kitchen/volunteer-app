import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RsvpControl } from '@/components/rsvp-control';
import { Avatar, Badge, EmptyState, Icon, Text } from '@/components/ui';
import { Layout, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { canReply, formatRsvpTally, rsvpClosedMessage } from '@/lib/events';
import { formatLongDate, formatRelativeTime } from '@/lib/format';
import { qk } from '@/lib/query-keys';
import { getAnnouncementById } from '@/services/announcements-service';

export default function NoticeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const { data: notice, isLoading } = useQuery({
    queryKey: qk.notice(id),
    queryFn: () => getAnnouncementById(id),
  });

  // A fixed height keeps the fit-to-contents sheet from collapsing while we wait.
  if (isLoading) {
    return (
      <View style={{ height: 240, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!notice) {
    return (
      <View style={{ minHeight: 320, backgroundColor: colors.background, justifyContent: 'center' }}>
        <EmptyState
          icon="notifications-outline"
          illustration="korero"
          title="Notice not found"
          message="This notice may have been taken down."
        />
      </View>
    );
  }

  return (
    <View
      style={{
        backgroundColor: colors.background,
        paddingHorizontal: Layout.screenPadding,
        paddingTop: Spacing.xxxl,
        paddingBottom: insets.bottom + Spacing.xxl,
      }}>
      <View style={{ width: '100%', maxWidth: Layout.maxContentWidth, alignSelf: 'center' }}>
        {/* Status — pinned notices read as time-sensitive */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
          {notice.pinned ? (
            <Badge label="Important" tone="brand" icon="alert-circle" />
          ) : (
            <Badge label="Notice" tone="neutral" />
          )}
          <View style={{ flex: 1 }} />
          <Text variant="caption" color="textTertiary">
            {formatRelativeTime(notice.publishedAt)}
          </Text>
        </View>

        {/* Title */}
        <Text variant="display" style={{ marginTop: Spacing.lg }}>
          {notice.title}
        </Text>

        {/* Author */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.md }}>
          <Avatar name={notice.authorName} size={28} />
          <View style={{ flex: 1 }}>
            <Text variant="label" color="text" numberOfLines={1}>
              {notice.authorName}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Icon name="calendar-outline" size={13} color="textTertiary" />
              <Text variant="caption" color="textTertiary">
                {formatLongDate(notice.publishedAt)}
              </Text>
            </View>
          </View>
        </View>

        {/* Body */}
        <Text variant="body" color="text" style={{ marginTop: Spacing.xl, lineHeight: 26 }}>
          {notice.body}
        </Text>

        {/* When this pānui is announcing a gathering, the reply belongs here —
            the reader has just finished the invitation. */}
        {notice.event ? (
          <View
            style={{
              marginTop: Spacing.xl,
              paddingTop: Spacing.lg,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              gap: Spacing.md,
            }}>
            <View style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                <Icon name="calendar-outline" size={17} color="primary" />
                <Text variant="callout" style={{ flex: 1 }}>
                  {formatLongDate(notice.event.date)}
                </Text>
              </View>
              {notice.event.location ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                  <Icon name="location-outline" size={17} color="primary" />
                  <Text variant="callout" style={{ flex: 1 }}>
                    {notice.event.location}
                  </Text>
                </View>
              ) : null}
              {notice.event.rsvpEnabled && notice.event.status !== 'CANCELLED' ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                  <Icon name="people-outline" size={17} color="primary" />
                  <Text variant="callout" style={{ flex: 1 }}>
                    {formatRsvpTally(notice.event)}
                  </Text>
                </View>
              ) : null}
            </View>
            {canReply(notice.event) ? (
              <View style={{ gap: Spacing.sm }}>
                <Text variant="label">Can you come?</Text>
                <RsvpControl event={notice.event} />
              </View>
            ) : (
              <Text variant="caption" color="textTertiary">
                {rsvpClosedMessage(notice.event)}
              </Text>
            )}
          </View>
        ) : null}
      </View>
    </View>
  );
}
