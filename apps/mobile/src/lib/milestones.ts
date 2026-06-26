/**
 * Volunteer hour milestones. Ported from the web app (`apps/web/src/lib/milestones.ts`).
 * Each milestone carries a Te Reo honorific that recognises the volunteer's mahi.
 */

import type { Milestone } from '@/types/models';

type MilestoneDef = Pick<Milestone, 'hours' | 'label' | 'term'>;

const MILESTONES: readonly MilestoneDef[] = [
  { hours: 10, label: '10 hours', term: 'Whetū' },
  { hours: 25, label: '25 hours', term: 'Aroha' },
  { hours: 50, label: '50 hours', term: 'Mana' },
  { hours: 100, label: '100 hours', term: 'Kaitiaki' },
  { hours: 250, label: '250 hours', term: 'Rangatira' },
  { hours: 500, label: '500 hours', term: 'Tohu Nui' },
] as const;

export function getMilestones(totalHours: number): Milestone[] {
  return MILESTONES.map((m) => ({ ...m, reached: totalHours >= m.hours }));
}

export function nextMilestone(totalHours: number): MilestoneDef | null {
  return MILESTONES.find((m) => totalHours < m.hours) ?? null;
}

export function reachedCount(totalHours: number): number {
  return MILESTONES.filter((m) => totalHours >= m.hours).length;
}
