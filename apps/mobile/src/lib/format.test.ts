import { describe, expect, it } from 'vitest';

import { formatTime, formatTimeRange } from '@/lib/format';

describe('formatTime', () => {
  it('drops the minutes on the hour', () => {
    expect(formatTime('09:00')).toBe('9am');
    expect(formatTime('13:00')).toBe('1pm');
  });

  it('keeps the minutes when there are some', () => {
    expect(formatTime('13:30')).toBe('1:30pm');
    expect(formatTime('07:05')).toBe('7:05am');
  });

  it('reads midnight and noon as 12', () => {
    expect(formatTime('00:00')).toBe('12am');
    expect(formatTime('12:00')).toBe('12pm');
    expect(formatTime('12:45')).toBe('12:45pm');
  });

  it('hands back anything it cannot read', () => {
    expect(formatTime('soon')).toBe('soon');
  });
});

describe('formatTimeRange', () => {
  it('gives both ends their period', () => {
    expect(formatTimeRange('09:00', '11:00')).toBe('9am – 11am');
    expect(formatTimeRange('09:00', '13:00')).toBe('9am – 1pm');
    expect(formatTimeRange('16:30', '19:30')).toBe('4:30pm – 7:30pm');
  });
});
