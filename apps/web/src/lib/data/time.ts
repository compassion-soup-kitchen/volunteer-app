export function parseTime(time: string): { hours: number; minutes: number } {
  const [h, m] = time.split(":").map(Number);
  return { hours: h, minutes: m };
}

export function diffHours(start: string, end: string): number {
  const s = parseTime(start);
  const e = parseTime(end);
  return (e.hours * 60 + e.minutes - (s.hours * 60 + s.minutes)) / 60;
}
