import { useQuery } from '@tanstack/react-query';
import { View } from 'react-native';

import { AnnouncementCard } from '@/components/announcement-card';
import { EmptyState, Screen, SkeletonCard, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { qk } from '@/lib/query-keys';
import { getAnnouncements } from '@/services/announcements-service';

export default function NewsScreen() {
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: qk.announcements,
    queryFn: getAnnouncements,
  });

  const notices = data ?? [];

  return (
    <Screen onRefresh={refetch} refreshing={isRefetching} insetTop={false}>
      <View style={{ gap: 4 }}>
        <Text variant="overline" color="primary">
          Ngā pānui
        </Text>
        <Text variant="display">Notices</Text>
        <Text variant="body" color="textSecondary">
          The latest from the team.
        </Text>
      </View>

      {isLoading ? (
        <View style={{ gap: Spacing.md }}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : notices.length === 0 ? (
        <EmptyState
          icon="notifications-outline"
          illustration="korero"
          tone="brand"
          title="No notices right now"
          message="Team updates and notices will appear here."
        />
      ) : (
        <View style={{ gap: Spacing.md }}>
          {notices.map((item) => (
            <AnnouncementCard key={item.id} item={item} compact={false} />
          ))}
        </View>
      )}
    </Screen>
  );
}
