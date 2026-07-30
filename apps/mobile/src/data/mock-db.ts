/**
 * In-memory mock database.
 *
 * This is the swappable seam for the app. Every service in `src/services/*`
 * reads and mutates this store, so the UI behaves exactly as it will against a
 * real backend (signing up for a shift updates the dashboard, etc.). When the
 * web app grows a JSON API, each service swaps its `db` access for a `fetch`
 * and nothing in the screens changes.
 *
 * Dates are generated relative to the device's "today" so the app always looks
 * live. State persists for the session and resets on reload — fine for a mock.
 */

import type {
  Announcement,
  ApplicationSubmission,
  AttendanceStatus,
  MyApplication,
  ServiceArea,
  SessionUser,
  SignupStatus,
  TrainingHistoryItem,
  TrainingType,
  VolunteerEvent,
} from '@/types/models';

/* -------------------------------------------------------------------------- */
/*  Date helpers                                                               */
/* -------------------------------------------------------------------------- */

const TODAY = new Date();

function isoDate(offsetDays: number): string {
  const d = new Date(TODAY);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

/** A full ISO datetime `hoursAgo` before now — for announcement timestamps. */
function isoTimeAgo(hoursAgo: number): string {
  const d = new Date(TODAY);
  d.setHours(d.getHours() - hoursAgo);
  return d.toISOString();
}

/* -------------------------------------------------------------------------- */
/*  Internal record types                                                      */
/* -------------------------------------------------------------------------- */

export interface ShiftRecord {
  id: string;
  serviceAreaId: string;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  notes?: string;
  /** Meals served on this shift (recorded by staff for past shifts) */
  mealsServed: number;
  /** Volunteers signed up other than the current user */
  otherSignups: number;
}

export interface MySignup {
  id: string;
  status: SignupStatus;
  signedUpAt: string;
}

export interface TrainingRecord {
  id: string;
  type: TrainingType;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  location?: string;
  otherRegistered: number;
}

export interface MyTraining {
  id: string;
  status: AttendanceStatus;
}

interface ProfileRecord {
  id: string;
  phone: string;
  address: string;
  dateOfBirth: string;
  bio: string;
  skills: string[];
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship: string;
  memberSince: string;
  interestIds: string[];
}

/** A submitted volunteer application awaiting staff review. */
export interface ApplicationRecord extends MyApplication {
  data: ApplicationSubmission;
}

interface MockDb {
  session: SessionUser | null;
  /**
   * The signed-in user's volunteer application. `null` for the seeded
   * volunteer (long since approved) and for fresh applicants who haven't
   * submitted yet; set by `submitApplication`.
   */
  application: ApplicationRecord | null;
  serviceAreas: ServiceArea[];
  shifts: ShiftRecord[];
  mySignups: Record<string, MySignup>;
  training: TrainingRecord[];
  myTraining: Record<string, MyTraining>;
  pastTraining: TrainingHistoryItem[];
  announcements: Announcement[];
  /**
   * Gatherings, shared with the announcements that link to them — an
   * announcement holds the same object, so replying updates both at once, the
   * way a single row does on the server.
   */
  events: VolunteerEvent[];
  profile: ProfileRecord;
}

/* -------------------------------------------------------------------------- */
/*  Seed                                                                       */
/* -------------------------------------------------------------------------- */

const serviceAreas: ServiceArea[] = [
  { id: 'sa-kitchen', name: 'Kitchen', maori: 'Kīhini', description: 'Meal prep and cooking the kai.' },
  { id: 'sa-dining', name: 'Dining service', maori: 'Wharekai', description: 'Welcoming and serving our manuhiri.' },
  { id: 'sa-rescue', name: 'Food rescue', maori: 'Manaaki kai', description: 'Collecting and sorting donated kai.' },
  { id: 'sa-garden', name: 'Community garden', maori: 'Māra kai', description: 'Growing fresh produce for the kitchen.' },
  { id: 'sa-welcome', name: 'Front of house', maori: 'Te Manaaki', description: 'Greeting and supporting everyone who comes in.' },
];

/** The seeded volunteer the mock signs you in as. */
const SEED_USER: SessionUser = {
  id: 'vol-aroha',
  name: 'Aroha Mātaira',
  email: 'aroha@compassion.org.nz',
  role: 'VOLUNTEER',
};

// Past shifts the volunteer attended — drives hours, meals and milestones.
const attended: ShiftRecord[] = [
  { id: 'sh-p1', serviceAreaId: 'sa-dining', date: isoDate(-3), startTime: '11:30', endTime: '14:00', capacity: 8, mealsServed: 95, otherSignups: 5 },
  { id: 'sh-p2', serviceAreaId: 'sa-kitchen', date: isoDate(-10), startTime: '09:00', endTime: '13:00', capacity: 8, mealsServed: 130, otherSignups: 6 },
  { id: 'sh-p3', serviceAreaId: 'sa-rescue', date: isoDate(-17), startTime: '08:00', endTime: '11:00', capacity: 6, mealsServed: 0, otherSignups: 3 },
  { id: 'sh-p4', serviceAreaId: 'sa-dining', date: isoDate(-24), startTime: '17:00', endTime: '20:00', capacity: 8, mealsServed: 110, otherSignups: 7 },
  { id: 'sh-p5', serviceAreaId: 'sa-kitchen', date: isoDate(-33), startTime: '09:00', endTime: '13:30', capacity: 8, mealsServed: 140, otherSignups: 6 },
  { id: 'sh-p6', serviceAreaId: 'sa-dining', date: isoDate(-40), startTime: '11:30', endTime: '14:00', capacity: 8, mealsServed: 88, otherSignups: 5 },
  { id: 'sh-p7', serviceAreaId: 'sa-garden', date: isoDate(-47), startTime: '10:00', endTime: '13:00', capacity: 6, mealsServed: 0, otherSignups: 4 },
  { id: 'sh-p8', serviceAreaId: 'sa-kitchen', date: isoDate(-61), startTime: '09:00', endTime: '13:00', capacity: 8, mealsServed: 120, otherSignups: 6 },
  { id: 'sh-p9', serviceAreaId: 'sa-dining', date: isoDate(-75), startTime: '17:00', endTime: '20:00', capacity: 8, mealsServed: 102, otherSignups: 7 },
  { id: 'sh-p10', serviceAreaId: 'sa-rescue', date: isoDate(-89), startTime: '08:00', endTime: '11:30', capacity: 6, mealsServed: 0, otherSignups: 3 },
  { id: 'sh-p11', serviceAreaId: 'sa-kitchen', date: isoDate(-104), startTime: '09:00', endTime: '13:00', capacity: 8, mealsServed: 125, otherSignups: 6 },
  { id: 'sh-p12', serviceAreaId: 'sa-dining', date: isoDate(-120), startTime: '11:30', endTime: '14:00', capacity: 8, mealsServed: 80, otherSignups: 5 },
];

// Upcoming shifts the volunteer has signed up for — their roster.
const roster: ShiftRecord[] = [
  { id: 'sh-r1', serviceAreaId: 'sa-dining', date: isoDate(2), startTime: '11:30', endTime: '14:00', capacity: 8, notes: 'Sunday lunch service — extra hands always welcome.', mealsServed: 0, otherSignups: 4 },
  { id: 'sh-r2', serviceAreaId: 'sa-kitchen', date: isoDate(6), startTime: '09:00', endTime: '13:00', capacity: 8, notes: 'Prep and cook ahead for the week.', mealsServed: 0, otherSignups: 5 },
];

// Open future shifts (some in the volunteer's interest areas, some full).
const upcoming: ShiftRecord[] = [
  { id: 'sh-u1', serviceAreaId: 'sa-rescue', date: isoDate(3), startTime: '08:00', endTime: '11:00', capacity: 6, notes: 'Early pick-up run from local supermarkets.', mealsServed: 0, otherSignups: 2 },
  { id: 'sh-u2', serviceAreaId: 'sa-kitchen', date: isoDate(4), startTime: '17:00', endTime: '20:00', capacity: 8, mealsServed: 0, otherSignups: 3 },
  { id: 'sh-u3', serviceAreaId: 'sa-garden', date: isoDate(5), startTime: '10:00', endTime: '13:00', capacity: 6, notes: 'Winter planting — bring a warm jacket.', mealsServed: 0, otherSignups: 6 },
  { id: 'sh-u4', serviceAreaId: 'sa-welcome', date: isoDate(7), startTime: '11:00', endTime: '14:00', capacity: 4, mealsServed: 0, otherSignups: 1 },
  { id: 'sh-u5', serviceAreaId: 'sa-dining', date: isoDate(9), startTime: '17:00', endTime: '20:00', capacity: 8, mealsServed: 0, otherSignups: 6 },
  { id: 'sh-u6', serviceAreaId: 'sa-kitchen', date: isoDate(11), startTime: '09:00', endTime: '13:00', capacity: 8, mealsServed: 0, otherSignups: 7 },
  { id: 'sh-u7', serviceAreaId: 'sa-dining', date: isoDate(13), startTime: '11:30', endTime: '14:00', capacity: 8, mealsServed: 0, otherSignups: 8 },
  { id: 'sh-u8', serviceAreaId: 'sa-rescue', date: isoDate(16), startTime: '08:00', endTime: '11:30', capacity: 6, mealsServed: 0, otherSignups: 1 },
  { id: 'sh-u9', serviceAreaId: 'sa-garden', date: isoDate(18), startTime: '10:00', endTime: '13:00', capacity: 6, mealsServed: 0, otherSignups: 0 },
  { id: 'sh-u10', serviceAreaId: 'sa-welcome', date: isoDate(21), startTime: '11:00', endTime: '14:00', capacity: 4, mealsServed: 0, otherSignups: 0 },
];

function seedSignups(): Record<string, MySignup> {
  const signedAt = new Date(TODAY).toISOString();
  const map: Record<string, MySignup> = {};
  attended.forEach((s, i) => {
    map[s.id] = { id: `sg-a${i}`, status: 'ATTENDED', signedUpAt: signedAt };
  });
  roster.forEach((s, i) => {
    map[s.id] = { id: `sg-r${i}`, status: 'SIGNED_UP', signedUpAt: signedAt };
  });
  return map;
}

const training: TrainingRecord[] = [
  {
    id: 'tr-1',
    type: 'INDUCTION',
    title: 'Volunteer induction',
    description: 'Meet the team, walk the kitchen and learn how we keep everyone safe and welcome.',
    date: isoDate(8),
    startTime: '10:00',
    endTime: '12:00',
    capacity: 12,
    location: 'Soup Kitchen, 2 Rhine St, Island Bay',
    otherRegistered: 5,
  },
  {
    id: 'tr-2',
    type: 'DE_ESCALATION',
    title: 'Calm in the kitchen: de-escalation',
    description: 'Practical skills for supporting manuhiri in distress with manaakitanga and patience.',
    date: isoDate(12),
    startTime: '18:00',
    endTime: '20:00',
    capacity: 15,
    location: 'Whānau Room',
    otherRegistered: 9,
  },
  {
    id: 'tr-3',
    type: 'HEALTH_SAFETY',
    title: 'Food safety & hygiene refresher',
    description: 'Annual refresher on safe food handling, allergens and cleaning routines.',
    date: isoDate(19),
    startTime: '13:00',
    endTime: '15:00',
    capacity: 20,
    location: 'Kīhini',
    otherRegistered: 11,
  },
  {
    id: 'tr-4',
    type: 'OTHER',
    title: 'Te Tiriti & manaakitanga workshop',
    description: 'A korero on our kaupapa, Te Tiriti o Waitangi and caring for our whānau.',
    date: isoDate(27),
    startTime: '17:30',
    endTime: '19:30',
    capacity: 25,
    location: 'Wharekai',
    otherRegistered: 14,
  },
];

const pastTraining: TrainingHistoryItem[] = [
  { id: 'tr-h1', type: 'INDUCTION', title: 'Volunteer induction', date: isoDate(-122), status: 'ATTENDED' },
  { id: 'tr-h2', type: 'HEALTH_SAFETY', title: 'Food safety basics', date: isoDate(-100), status: 'ATTENDED' },
];

// Gatherings the whānau is invited to. Separate from shifts (nobody is
// rostered) and from the pānui that announce them.
const events: VolunteerEvent[] = [
  {
    id: 'ev-party',
    title: 'Christmas party for the whānau',
    description:
      "Kai, waiata and a Secret Santa to thank you all for a huge year. Bring a plate if you can, and tamariki are more than welcome.",
    date: isoDate(24),
    startTime: '18:00',
    endTime: '21:00',
    location: '132 Tory Street, Te Aro, Pōneke',
    audience: 'ALL',
    status: 'PUBLISHED',
    rsvpEnabled: true,
    rsvpDeadline: isoDate(14),
    goingCount: 31,
    maybeCount: 6,
    myResponse: null,
    myNote: null,
  },
  {
    id: 'ev-hui',
    title: 'Volunteer hui — how did the year go?',
    description:
      'A cuppa and an honest kōrero about what worked this year and what we should change. Everyone welcome.',
    date: isoDate(9),
    startTime: '10:30',
    endTime: '12:00',
    location: 'Upstairs meeting room, 132 Tory Street',
    audience: 'ALL',
    status: 'PUBLISHED',
    rsvpEnabled: true,
    rsvpDeadline: null,
    goingCount: 12,
    maybeCount: 4,
    myResponse: 'GOING',
    myNote: null,
  },
];

// Team pānui — coordinator notices the volunteer sees on opening the app.
const announcements: Announcement[] = [
  {
    id: 'an-1',
    title: 'Kia ora — we need two more for Friday dinner',
    body: "We're a little short for this Friday's dinner service (5–8pm). If you can lend a hand, please pick up a spot from the roster — ngā mihi nui to those who already have.",
    audience: 'VOLUNTEERS',
    authorName: 'Hana Wīremu',
    publishedAt: isoTimeAgo(3),
    pinned: true,
    event: null,
  },
  {
    id: 'an-party',
    title: 'Christmas party for the whānau',
    body: "Kai, waiata and a Secret Santa to thank you all for a huge year. Let us know if you can come so we can sort the kai.",
    audience: 'ALL',
    authorName: 'Wikitōria Grace',
    publishedAt: isoTimeAgo(6),
    pinned: true,
    // The link is what puts the reply buttons in the feed.
    event: events[0],
  },
  {
    id: 'an-2',
    title: 'New winter menu starts Monday',
    body: 'The kitchen has refreshed the menu for the colder months — heartier soups through the week and a roast on Sundays. Come hungry; there may be taste-testing.',
    audience: 'ALL',
    authorName: 'Te Pūaroha kitchen',
    publishedAt: isoTimeAgo(27),
    pinned: false,
    event: null,
  },
  {
    id: 'an-3',
    title: 'A record month — thank you, whānau',
    body: 'Together we served more than 3,000 meals last month. Every hour you give keeps the kitchen warm and our manuhiri cared for. Mauri ora!',
    audience: 'ALL',
    authorName: 'Wikitōria Grace',
    publishedAt: isoTimeAgo(50),
    pinned: false,
    event: null,
  },
  {
    id: 'an-4',
    title: 'Rhine St carpark closed Mon–Wed',
    body: 'The carpark is being resealed early next week. Please use street parking and allow a few extra minutes to get settled before your shift.',
    audience: 'VOLUNTEERS',
    authorName: 'Hana Wīremu',
    publishedAt: isoTimeAgo(74),
    pinned: false,
    event: null,
  },
];

export const db: MockDb = {
  session: null,
  application: null,
  serviceAreas,
  shifts: [...attended, ...roster, ...upcoming],
  mySignups: seedSignups(),
  training,
  myTraining: { 'tr-2': { id: 'ta-1', status: 'REGISTERED' } },
  pastTraining,
  announcements,
  events,
  profile: {
    id: 'vol-aroha',
    phone: '021 555 0142',
    address: '14 Clyde Street, Island Bay, Wellington 6023',
    dateOfBirth: '1958-09-12',
    bio: 'Retired nurse, here most weekends. I love the buzz of a busy service and a good cuppa afterwards.',
    skills: ['Food preparation', 'Cooking', 'First aid', 'Te reo Māori'],
    emergencyContactName: 'Hemi Mātaira',
    emergencyContactPhone: '021 555 0199',
    emergencyContactRelationship: 'Partner',
    memberSince: isoDate(-130),
    interestIds: ['sa-kitchen', 'sa-dining', 'sa-rescue'],
  },
};

export { SEED_USER };

/* -------------------------------------------------------------------------- */
/*  Shared helpers                                                             */
/* -------------------------------------------------------------------------- */

let idSeq = 1000;
export function nextId(prefix: string): string {
  idSeq += 1;
  return `${prefix}-${idSeq}`;
}

export function areaById(id: string): ServiceArea | undefined {
  return db.serviceAreas.find((a) => a.id === id);
}

/** Diff in hours between two `HH:mm` times. */
export function diffHours(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  return Math.max(0, eh * 60 + em - (sh * 60 + sm)) / 60;
}

/** Signups visible on a shift = others + the current user if actively signed up. */
export function signupCount(shift: ShiftRecord): number {
  const mine = db.mySignups[shift.id];
  const meCounts = mine && (mine.status === 'SIGNED_UP' || mine.status === 'ATTENDED') ? 1 : 0;
  return shift.otherSignups + meCounts;
}

export function isPast(date: string): boolean {
  return date < isoDate(0);
}

export { isoDate };
