/**
 * The road from application to a first shift, read from the volunteer's real
 * record: their lifecycle status, their Ministry of Justice check and where
 * their induction stands. Pure, so the onboarding screen only draws it.
 */

import { formatShiftDate } from '@/lib/format';
import type { MojStatus, TrainingModuleState, VolunteerStatus } from '@/types/models';

/** A volunteer who hasn't reached ACTIVE/INACTIVE is still working through onboarding. */
export function isOnboarding(status: VolunteerStatus): boolean {
  return (
    status === 'APPLICATION_SUBMITTED' ||
    status === 'AWAITING_VETTING' ||
    status === 'APPROVED_FOR_INDUCTION'
  );
}

export type OnboardingStepState = 'done' | 'current' | 'locked';

/** What tapping a step does, when there is something the volunteer can do about it. */
export type OnboardingAction = { kind: 'book-induction' } | { kind: 'open-induction'; sessionId: string };

export interface OnboardingStep {
  key: 'application' | 'vetting' | 'induction' | 'first-shift';
  title: string;
  hint: string;
  state: OnboardingStepState;
  action?: OnboardingAction;
}

export interface OnboardingInput {
  status: VolunteerStatus;
  mojStatus: MojStatus;
  /** The induction module from training readiness, with the booked session if there is one. */
  induction: { state: TrainingModuleState; date: string | null; sessionId: string | null } | null;
}

const PAST_VETTING: VolunteerStatus[] = ['APPROVED_FOR_INDUCTION', 'ACTIVE', 'INACTIVE'];
const PAST_INDUCTION: VolunteerStatus[] = ['ACTIVE', 'INACTIVE'];

/**
 * Four steps, in order. Each is done or not on the record alone; the first one
 * not done is the current step and the rest wait behind it.
 */
export function onboardingSteps({ status, mojStatus, induction }: OnboardingInput): OnboardingStep[] {
  const vettingDone = PAST_VETTING.includes(status) || mojStatus === 'CLEARED';
  const inductionDone = PAST_INDUCTION.includes(status) || induction?.state === 'COMPLETE';
  const onRoster = PAST_INDUCTION.includes(status);

  const done = [true, vettingDone, inductionDone, onRoster];
  const current = done.indexOf(false);
  const stateAt = (i: number): OnboardingStepState => (done[i] ? 'done' : i === current ? 'current' : 'locked');

  const booked = induction?.state === 'BOOKED' && induction.date ? induction : null;
  const inductionState = stateAt(2);

  return [
    {
      key: 'application',
      title: 'Application received',
      hint: 'Done',
      state: 'done',
    },
    {
      key: 'vetting',
      title: 'Background check',
      // A flagged check is a conversation for the team to have in person, so it
      // reads the same as one still under way.
      hint: vettingDone ? 'Cleared' : mojStatus === 'SUBMITTED' ? 'With the Ministry of Justice' : 'Our coordinators are on it',
      state: stateAt(1),
    },
    {
      key: 'induction',
      title: 'Your induction',
      hint: inductionDone
        ? 'Done'
        : booked
          ? `Booked for ${formatShiftDate(booked.date!)}`
          : inductionState === 'current'
            ? 'Book a session'
            : 'Once your check clears',
      state: inductionState,
      // A booking can be looked at any time; booking one waits for its turn.
      action: inductionDone
        ? undefined
        : booked?.sessionId
          ? { kind: 'open-induction', sessionId: booked.sessionId }
          : inductionState === 'current'
            ? { kind: 'book-induction' }
            : undefined,
    },
    {
      key: 'first-shift',
      title: 'Your first shift',
      hint: onRoster ? 'Done' : stateAt(3) === 'current' ? "We'll open the roster for you soon" : 'After your induction',
      state: stateAt(3),
    },
  ];
}
