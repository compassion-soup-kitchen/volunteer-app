/**
 * Training service (mock). Mirrors `getAvailableTraining`,
 * `registerForTraining` and `cancelTrainingRegistration` in the web app.
 */

import { db, isPast, nextId, type TrainingRecord } from '@/data/mock-db';
import { computeReadiness, isCoreTraining } from '@/lib/training';
import type {
  ActionResult,
  TrainingListItem,
  TrainingOverview,
  TrainingSessionWithDetails,
} from '@/types/models';

import { delay } from './client';

/** Chronological by date then start time. */
function byDateTime(a: { date: string; startTime: string }, b: { date: string; startTime: string }): number {
  return (a.date + a.startTime).localeCompare(b.date + b.startTime);
}

function registeredCount(t: TrainingRecord): number {
  const mine = db.myTraining[t.id];
  const meCounts = mine && (mine.status === 'REGISTERED' || mine.status === 'ATTENDED') ? 1 : 0;
  return t.otherRegistered + meCounts;
}

function toDetails(t: TrainingRecord): TrainingSessionWithDetails {
  const mine = db.myTraining[t.id];
  return {
    id: t.id,
    type: t.type,
    title: t.title,
    description: t.description,
    date: t.date,
    startTime: t.startTime,
    endTime: t.endTime,
    capacity: t.capacity,
    location: t.location ?? null,
    registeredCount: registeredCount(t),
    userAttendanceId: mine && mine.status !== 'CANCELLED' ? mine.id : null,
    userAttendanceStatus: mine && mine.status !== 'CANCELLED' ? mine.status : null,
  };
}

export async function getAvailableTraining(): Promise<TrainingSessionWithDetails[]> {
  await delay();
  return db.training.filter((t) => !isPast(t.date)).sort(byDateTime).map(toDetails);
}

/**
 * The full Training-tab payload: the volunteer's readiness against the required
 * curriculum, their booked sessions, what's open to register for, and their
 * completed record. Mirrors the shape a future `getTrainingOverview` server
 * action would return so the screen never changes when the backend lands.
 */
export async function getTrainingOverview(): Promise<TrainingOverview> {
  await delay();

  const upcoming = db.training.filter((t) => !isPast(t.date)).sort(byDateTime).map(toDetails);

  const completed = db.pastTraining
    .filter((h) => h.status === 'ATTENDED')
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date));

  const completedTypes = new Set(completed.map((h) => h.type));

  const registeredRaw = upcoming.filter((s) => s.userAttendanceStatus === 'REGISTERED');

  const readiness = computeReadiness({
    completed: completed.map((h) => ({ type: h.type, date: h.date })),
    booked: registeredRaw.map((s) => ({ type: s.type, date: s.date })),
  });

  const decorate = (s: TrainingSessionWithDetails): TrainingListItem => {
    const core = isCoreTraining(s.type);
    const refresher = completedTypes.has(s.type);
    const registered = s.userAttendanceStatus === 'REGISTERED';
    return { ...s, core, refresher, recommended: core && !refresher && !registered };
  };

  return {
    readiness,
    registered: registeredRaw.map(decorate),
    available: upcoming.filter((s) => s.userAttendanceStatus !== 'REGISTERED').map(decorate),
    completed,
  };
}

export async function registerForTraining(sessionId: string): Promise<ActionResult> {
  await delay();
  const session = db.training.find((t) => t.id === sessionId);
  if (!session) return { error: 'That training session could not be found.' };
  if (isPast(session.date)) return { error: 'That session has already passed.' };

  const mine = db.myTraining[sessionId];
  if (mine && (mine.status === 'REGISTERED' || mine.status === 'ATTENDED')) {
    return { error: "You're already registered for this session." };
  }
  if (registeredCount(session) >= session.capacity) return { error: 'This session is now full.' };

  db.myTraining[sessionId] = { id: mine?.id ?? nextId('ta'), status: 'REGISTERED' };
  return { success: true };
}

export async function cancelTrainingRegistration(sessionId: string): Promise<ActionResult> {
  await delay();
  const session = db.training.find((t) => t.id === sessionId);
  if (!session) return { error: 'That training session could not be found.' };
  const mine = db.myTraining[sessionId];
  if (!mine || mine.status !== 'REGISTERED') return { error: "You're not registered for this session." };
  if (isPast(session.date)) return { error: 'That session has already passed.' };

  db.myTraining[sessionId] = { ...mine, status: 'CANCELLED' };
  return { success: true };
}
