import { describe, expect, it } from 'vitest';

import {
  addDaysIso,
  afterLeaveNote,
  describeLeaveStatus,
  formatLeaveLength,
  formatLeaveRange,
  leaveActions,
  leaveFormProblem,
  leaveStage,
  offersLeave,
} from '@/lib/leave';

const TODAY = '2026-10-16';
const range = (startsOn: string, endsOn: string) => ({ startsOn, endsOn });

describe('leaveStage', () => {
  it('places leave against today', () => {
    expect(leaveStage(range('2026-10-17', '2026-10-20'), TODAY)).toBe('upcoming');
    expect(leaveStage(range('2026-10-16', '2026-10-16'), TODAY)).toBe('current');
    expect(leaveStage(range('2026-10-01', '2026-10-15'), TODAY)).toBe('past');
  });
});

describe('formatLeaveRange', () => {
  it('formats compactly', () => {
    expect(formatLeaveRange(range('2026-11-03', '2026-11-03'))).toBe('Tue 3 Nov');
    expect(formatLeaveRange(range('2026-11-03', '2026-11-14'))).toBe('3 – 14 Nov');
    expect(formatLeaveRange(range('2026-11-28', '2026-12-04'))).toBe('28 Nov – 4 Dec');
    expect(formatLeaveRange(range('2026-12-21', '2027-01-08'))).toBe('21 Dec 2026 – 8 Jan 2027');
  });

  it('adds the year when it isn’t this year', () => {
    expect(formatLeaveRange(range('2027-03-01', '2027-03-05'), TODAY)).toBe('1 – 5 Mar 2027');
  });

  it('counts days', () => {
    expect(formatLeaveLength(range('2026-11-03', '2026-11-14'))).toBe('12 days');
    expect(formatLeaveLength(range('2026-11-03', '2026-11-03'))).toBe('1 day');
  });
});

describe('describeLeaveStatus', () => {
  it('says where the leave is at', () => {
    expect(describeLeaveStatus(range('2026-10-10', '2026-10-20'), TODAY)).toBe('Away until Tue 20 Oct');
    expect(describeLeaveStatus(range('2026-10-10', '2026-10-16'), TODAY)).toBe('Away today, back tomorrow');
    expect(describeLeaveStatus(range('2026-11-03', '2026-11-14'), TODAY)).toBe('Starts Tue 3 Nov');
    expect(describeLeaveStatus(range('2026-10-01', '2026-10-05'), TODAY)).toBe('Back on Tue 6 Oct');
  });
});

describe('leaveFormProblem', () => {
  const check = (startsOn: string, endsOn: string, existing?: { startsOn: string; endsOn: string }) =>
    leaveFormProblem({ startsOn, endsOn, today: TODAY, existing });

  it('asks for both days', () => {
    expect(check('', '2026-11-01')).toMatch(/first day/);
    expect(check('2026-11-01', '')).toMatch(/last day/);
  });

  it('refuses a backwards or finished range', () => {
    expect(check('2026-11-05', '2026-11-01')).toMatch(/can’t be before/);
    expect(check('2026-10-01', '2026-10-15')).toMatch(/already finished/);
  });

  it('keeps the first day of leave under way', () => {
    expect(check('2026-10-12', '2026-10-25', range('2026-10-10', '2026-10-20'))).toMatch(/first day/);
    expect(check('2026-10-10', '2026-10-25', range('2026-10-10', '2026-10-20'))).toBeNull();
  });

  it('caps leave at a year', () => {
    expect(check('2026-11-01', addDaysIso('2026-11-01', 366))).toMatch(/up to a year/);
  });

  it('lets good dates through', () => {
    expect(check('2026-11-03', '2026-11-14')).toBeNull();
  });
});

describe('leaveActions', () => {
  it('follows the stage', () => {
    expect(leaveActions(range('2026-11-03', '2026-11-14'), TODAY)).toEqual({
      canEdit: true,
      canEndNow: false,
      canCancel: true,
    });
    expect(leaveActions(range('2026-10-10', '2026-10-20'), TODAY)).toEqual({
      canEdit: true,
      canEndNow: true,
      canCancel: false,
    });
    expect(leaveActions(range('2026-10-01', '2026-10-05'), TODAY)).toEqual({
      canEdit: false,
      canEndNow: false,
      canCancel: false,
    });
  });
});

describe('afterLeaveNote', () => {
  it('only promises what will actually happen', () => {
    expect(afterLeaveNote([{ isRegular: true }])).toBe('Regular spots come back if you shorten or cancel your leave.');
    expect(afterLeaveNote([{ isRegular: false }])).toBe(
      'You can sign up again if your plans change and there’s still room.',
    );
    expect(afterLeaveNote([{ isRegular: true }, { isRegular: false }])).toMatch(/come back.*for the others/);
  });
});

describe('offersLeave', () => {
  it('waits for a volunteer to finish onboarding', () => {
    expect(offersLeave({ role: 'VOLUNTEER', onboarding: true })).toBe(false);
    expect(offersLeave({ role: 'VOLUNTEER', onboarding: false })).toBe(true);
  });

  it('always offers it to the kitchen team, volunteer record or not', () => {
    expect(offersLeave({ role: 'COORDINATOR', onboarding: true })).toBe(true);
    expect(offersLeave({ role: 'ADMIN', onboarding: true })).toBe(true);
  });
});
