/**
 * Central React Query keys. After a mutation, invalidate the related keys —
 * the mobile equivalent of the web app's `revalidatePath`.
 */

export const qk = {
  dashboard: ['dashboard'] as const,
  announcements: ['announcements'] as const,
  notice: (id: string) => ['notice', id] as const,
  /** Every notice, for invalidating them all without knowing which one is open. */
  noticesAll: ['notice'] as const,
  /** When this person last opened the notices feed - a device-local read, not the API. */
  noticesSeen: (userId: string) => ['notices-seen', userId] as const,
  events: ['events'] as const,
  pastEvents: ['events', 'past'] as const,
  event: (id: string) => ['event', id] as const,
  serviceAreas: ['service-areas'] as const,
  shifts: (areaId?: string) => ['shifts', areaId ?? 'all'] as const,
  shiftsAll: ['shifts'] as const,
  shift: (id: string) => ['shift', id] as const,
  /** Every open shift detail, whichever one is showing. */
  shiftDetailsAll: ['shift'] as const,
  schedule: ['schedule'] as const,
  training: ['training'] as const,
  trainingOverview: ['training', 'overview'] as const,
  trainingSession: (id: string) => ['training', 'session', id] as const,
  hours: ['hours'] as const,
  profile: ['profile'] as const,
  application: ['application'] as const,
  /** What deleting your own account would erase. */
  accountDeletion: ['account', 'deletion'] as const,
  leave: ['leave'] as const,
};

/**
 * Logging or changing leave moves the roster - shifts come off, regular spots
 * come back - so every read of it is stale afterwards, not just the leave list.
 */
export const LEAVE_AFFECTS = [qk.leave, qk.dashboard, qk.shiftsAll, qk.schedule, qk.shiftDetailsAll] as const;
