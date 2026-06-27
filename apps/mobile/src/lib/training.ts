/**
 * Training domain logic — the required ("core") curriculum and the readiness
 * computation that drives the Training tab's hero.
 *
 * Pure and self-contained (no UI/theme imports) so it can be unit-tested and so
 * the service layer can build a `TrainingReadiness` without reaching into the
 * presentation layer. Presentational metadata (icons, tones) lives in
 * `components/meta.ts`; this file is only domain truth.
 */

import type { TrainingModule, TrainingReadiness, TrainingType } from '@/types/models';

/**
 * The modules every active volunteer is expected to complete, in the order they
 * should be tackled. Induction first, then the two safety modules. `OTHER`
 * (workshops) is enrichment, never part of readiness.
 */
export const CORE_TRAINING_TYPES: readonly TrainingType[] = [
  'INDUCTION',
  'HEALTH_SAFETY',
  'DE_ESCALATION',
] as const;

/** Short, human labels for the core modules (domain copy, theme-independent). */
const CORE_LABELS: Record<TrainingType, string> = {
  INDUCTION: 'Induction',
  HEALTH_SAFETY: 'Health & safety',
  DE_ESCALATION: 'De-escalation',
  OTHER: 'Workshop',
};

export function isCoreTraining(type: TrainingType): boolean {
  return CORE_TRAINING_TYPES.includes(type);
}

export interface ReadinessInput {
  /** Completed (attended) training, by type and date. */
  completed: { type: TrainingType; date: string }[];
  /** Upcoming registered training, by type and date. */
  booked: { type: TrainingType; date: string }[];
}

/**
 * Fold the volunteer's history and bookings into a per-module status for each
 * core requirement, plus the headline counts the hero reads from. A completed
 * module always wins over a booking of the same type.
 */
export function computeReadiness({ completed, booked }: ReadinessInput): TrainingReadiness {
  const modules: TrainingModule[] = CORE_TRAINING_TYPES.map((type) => {
    const done = completed.find((c) => c.type === type);
    if (done) return { type, label: CORE_LABELS[type], state: 'COMPLETE', date: done.date };

    const book = booked.find((b) => b.type === type);
    if (book) return { type, label: CORE_LABELS[type], state: 'BOOKED', date: book.date };

    return { type, label: CORE_LABELS[type], state: 'NOT_STARTED', date: null };
  });

  const completeCount = modules.filter((m) => m.state === 'COMPLETE').length;
  const bookedCount = modules.filter((m) => m.state === 'BOOKED').length;

  return {
    total: CORE_TRAINING_TYPES.length,
    complete: completeCount,
    booked: bookedCount,
    fullyTrained: completeCount === CORE_TRAINING_TYPES.length,
    modules,
  };
}
