import { describe, expect, it } from 'vitest';

import { shiftCardLabel } from '@/lib/a11y';

describe('shiftCardLabel', () => {
  const shift = { areaName: 'Kitchen', date: '2026-06-28', startTime: '09:00', endTime: '13:00' };

  it('says the date in full alongside the area and time', () => {
    expect(shiftCardLabel(shift)).toBe('Kitchen, Sunday 28 June, 9:00 am – 1:00 pm');
  });

  it('includes the meta line and the badge when the card shows them', () => {
    expect(shiftCardLabel({ ...shift, meta: '4 of 6 volunteers', badge: '2 spots left' })).toBe(
      'Kitchen, Sunday 28 June, 9:00 am – 1:00 pm, 4 of 6 volunteers, 2 spots left',
    );
  });
});
