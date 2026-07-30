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
  events: ['events'] as const,
  pastEvents: ['events', 'past'] as const,
  event: (id: string) => ['event', id] as const,
  serviceAreas: ['service-areas'] as const,
  shifts: (areaId?: string) => ['shifts', areaId ?? 'all'] as const,
  shiftsAll: ['shifts'] as const,
  shift: (id: string) => ['shift', id] as const,
  schedule: ['schedule'] as const,
  training: ['training'] as const,
  trainingOverview: ['training', 'overview'] as const,
  trainingSession: (id: string) => ['training', 'session', id] as const,
  hours: ['hours'] as const,
  profile: ['profile'] as const,
  application: ['application'] as const,
  /** What deleting your own account would erase. */
  accountDeletion: ['account', 'deletion'] as const,
};
