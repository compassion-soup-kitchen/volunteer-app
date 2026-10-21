import { describe, expect, it } from 'vitest';

import { isOnboarding, onboardingSteps } from '@/lib/onboarding';

const states = (steps: ReturnType<typeof onboardingSteps>) => steps.map((s) => s.state);

describe('isOnboarding', () => {
  it('holds until the volunteer is active', () => {
    expect(isOnboarding('APPLICATION_SUBMITTED')).toBe(true);
    expect(isOnboarding('AWAITING_VETTING')).toBe(true);
    expect(isOnboarding('APPROVED_FOR_INDUCTION')).toBe(true);
    expect(isOnboarding('ACTIVE')).toBe(false);
    expect(isOnboarding('INACTIVE')).toBe(false);
  });
});

describe('onboardingSteps', () => {
  it('waits on the background check after applying', () => {
    const steps = onboardingSteps({ status: 'AWAITING_VETTING', mojStatus: 'SUBMITTED', induction: null });
    expect(states(steps)).toEqual(['done', 'current', 'locked', 'locked']);
    expect(steps[1].hint).toBe('With the Ministry of Justice');
    expect(steps[2].action).toBeUndefined();
  });

  it('never says a check was flagged', () => {
    const steps = onboardingSteps({ status: 'AWAITING_VETTING', mojStatus: 'FLAGGED', induction: null });
    expect(steps[1].hint).toBe('Our coordinators are on it');
  });

  it('asks for an induction booking once the check clears', () => {
    const steps = onboardingSteps({
      status: 'APPROVED_FOR_INDUCTION',
      mojStatus: 'CLEARED',
      induction: { state: 'NOT_STARTED', date: null, sessionId: null },
    });
    expect(states(steps)).toEqual(['done', 'done', 'current', 'locked']);
    expect(steps[2].hint).toBe('Book a session');
    expect(steps[2].action).toEqual({ kind: 'book-induction' });
  });

  it('opens a booked induction, even while the check is still under way', () => {
    const steps = onboardingSteps({
      status: 'AWAITING_VETTING',
      mojStatus: 'SUBMITTED',
      induction: { state: 'BOOKED', date: '2026-11-03', sessionId: 'tr-9' },
    });
    expect(steps[2].state).toBe('locked');
    expect(steps[2].hint).toBe('Booked for Tue 3 Nov');
    expect(steps[2].action).toEqual({ kind: 'open-induction', sessionId: 'tr-9' });
  });

  it('waits on the team once the induction is done', () => {
    const steps = onboardingSteps({
      status: 'APPROVED_FOR_INDUCTION',
      mojStatus: 'CLEARED',
      induction: { state: 'COMPLETE', date: '2026-10-01', sessionId: null },
    });
    expect(states(steps)).toEqual(['done', 'done', 'done', 'current']);
    expect(steps[2].action).toBeUndefined();
  });

  it('is all done for an active volunteer', () => {
    const steps = onboardingSteps({ status: 'ACTIVE', mojStatus: 'CLEARED', induction: null });
    expect(states(steps)).toEqual(['done', 'done', 'done', 'done']);
  });
});
