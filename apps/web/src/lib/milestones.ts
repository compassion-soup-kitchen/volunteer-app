export const MILESTONES = [
  { hours: 10, label: "10 Hours", term: "Whetū" },
  { hours: 25, label: "25 Hours", term: "Aroha" },
  { hours: 50, label: "50 Hours", term: "Mana" },
  { hours: 100, label: "100 Hours", term: "Kaitiaki" },
  { hours: 250, label: "250 Hours", term: "Rangatira" },
  { hours: 500, label: "500 Hours", term: "Tohu Nui" },
] as const;

export type Milestone = {
  hours: number;
  label: string;
  term: string;
  reached: boolean;
};

export function getMilestones(totalHours: number): Milestone[] {
  return MILESTONES.map((m) => ({
    ...m,
    reached: totalHours >= m.hours,
  }));
}
