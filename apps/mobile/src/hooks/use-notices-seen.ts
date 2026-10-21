import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import { useCallback } from 'react';

import { newestPublishedAt } from '@/lib/notices';
import { qk } from '@/lib/query-keys';
import { useAuth } from '@/providers/auth-provider';
import type { Announcement } from '@/types/models';

/** Per person, so a shared phone doesn't mark one volunteer's notices read for another. */
function storageKey(userId: string): string {
  return `csk.notices-seen.${userId.replace(/[^\w.-]/g, '_')}`;
}

async function readSeen(userId: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(storageKey(userId));
  } catch {
    return null;
  }
}

async function writeSeen(userId: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(storageKey(userId), value);
  } catch {
    // Web / unsupported platforms: the count resets with the session.
  }
}

/**
 * When the volunteer last opened the notices feed (see `src/lib/notices.ts`),
 * and a `markSeen` to call as they open it. Held in React Query so every reader
 * updates the moment it changes.
 */
export function useNoticesSeen() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const qc = useQueryClient();

  const { data: lastSeenAt = null, isPending } = useQuery({
    queryKey: qk.noticesSeen(userId ?? ''),
    queryFn: () => readSeen(userId!),
    enabled: Boolean(userId),
    staleTime: Infinity,
  });

  const markSeen = useCallback(
    (notices: readonly Announcement[]) => {
      const newest = newestPublishedAt(notices);
      if (!userId || !newest) return;
      if (lastSeenAt && Date.parse(lastSeenAt) >= Date.parse(newest)) return;
      qc.setQueryData(qk.noticesSeen(userId), newest);
      void writeSeen(userId, newest);
    },
    [lastSeenAt, qc, userId],
  );

  // Until the stored value is read, nothing counts as unread - otherwise every
  // notice would flash up as new on launch.
  return { lastSeenAt, loaded: Boolean(userId) && !isPending, markSeen };
}
