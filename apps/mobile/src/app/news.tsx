import { useQuery } from '@tanstack/react-query';
import { View } from 'react-native';

import { AnnouncementCard } from '@/components/announcement-card';
import { EmptyState, PageHeader, Screen, SkeletonCard } from '@/components/ui';
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
      <PageHeader overline="Ngā pānui" title="Notices" subtitle="The latest from the team." />

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
