export const MILESTONES = [
  { hours: 10, label: "10 Hours", emoji: "whetu" },
  { hours: 25, label: "25 Hours", emoji: "aroha" },
  { hours: 50, label: "50 Hours", emoji: "mana" },
  { hours: 100, label: "100 Hours", emoji: "kaitiaki" },
  { hours: 250, label: "250 Hours", emoji: "rangatira" },
  { hours: 500, label: "500 Hours", emoji: "tohu nui" },
] as const;

export type Milestone = {
  hours: number;
  label: string;
  emoji: string;
  reached: boolean;
};

export function getMilestones(totalHours: number): Milestone[] {
  return MILESTONES.map((m) => ({
    ...m,
    reached: totalHours >= m.hours,
  }));
}
