/**
 * Central React Query keys. After a mutation, invalidate the related keys —
 * the mobile equivalent of the web app's `revalidatePath`.
 */

export const qk = {
  dashboard: ['dashboard'] as const,
  serviceAreas: ['service-areas'] as const,
  shifts: (areaId?: string) => ['shifts', areaId ?? 'all'] as const,
  shiftsAll: ['shifts'] as const,
  shift: (id: string) => ['shift', id] as const,
  training: ['training'] as const,
  hours: ['hours'] as const,
  profile: ['profile'] as const,
};
