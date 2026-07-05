/**
 * Training service. Mirrors `getAvailableTraining`, `registerForTraining` and
 * `cancelTrainingRegistration` in the web app; against the real API it calls
 * `/api/v1/training*`. Readiness against the core curriculum is computed here
 * on the client (see `@/lib/training`) from the session list plus the
 * volunteer's attendance history, so the backend only serves primitives.
 */

import { db, isPast, nextId, type TrainingRecord } from '@/data/mock-db';
import { computeReadiness, isCoreTraining } from '@/lib/training';
import type {
  ActionResult,
  TrainingHistoryItem,
  TrainingListItem,
  TrainingOverview,
  TrainingSessionWithDetails,
} from '@/types/models';

import { apiFetch, ApiError, delay, toActionError, USE_MOCK } from './client';

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

function mockUpcoming(): TrainingSessionWithDetails[] {
  return db.training.filter((t) => !isPast(t.date)).sort(byDateTime).map(toDetails);
}

export async function getAvailableTraining(): Promise<TrainingSessionWithDetails[]> {
  if (!USE_MOCK) return apiFetch<TrainingSessionWithDetails[]>('/api/v1/training');

  await delay();
  return mockUpcoming();
}

export async function getTrainingById(id: string): Promise<TrainingSessionWithDetails | null> {
  if (!USE_MOCK) {
    try {
      return await apiFetch<TrainingSessionWithDetails>(`/api/v1/training/${encodeURIComponent(id)}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }
  }

  await delay(140);
  const t = db.training.find((x) => x.id === id);
  return t ? toDetails(t) : null;
}

/**
 * Folds upcoming sessions and the volunteer's attendance history into the
 * Training-tab payload: readiness against the required curriculum, booked
 * sessions, what's open to register for, and the completed record.
 */
function buildOverview(
  upcoming: TrainingSessionWithDetails[],
  history: TrainingHistoryItem[],
): TrainingOverview {
  const completed = history
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

/** The full Training-tab payload. */
export async function getTrainingOverview(): Promise<TrainingOverview> {
  if (!USE_MOCK) {
    const [upcoming, history] = await Promise.all([
      apiFetch<TrainingSessionWithDetails[]>('/api/v1/training'),
      apiFetch<TrainingHistoryItem[]>('/api/v1/training/history'),
    ]);
    return buildOverview(upcoming, history);
  }

  await delay();
  return buildOverview(mockUpcoming(), db.pastTraining);
}

export async function registerForTraining(sessionId: string): Promise<ActionResult> {
  if (!USE_MOCK) {
    try {
      return await apiFetch<ActionResult>(
        `/api/v1/training/${encodeURIComponent(sessionId)}/registration`,
        { method: 'POST' },
      );
    } catch (err) {
      return toActionError(err);
    }
  }

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
  if (!USE_MOCK) {
    try {
      return await apiFetch<ActionResult>(
        `/api/v1/training/${encodeURIComponent(sessionId)}/registration`,
        { method: 'DELETE' },
      );
    } catch (err) {
      return toActionError(err);
    }
  }

  await delay();
  const session = db.training.find((t) => t.id === sessionId);
  if (!session) return { error: 'That training session could not be found.' };
  const mine = db.myTraining[sessionId];
  if (!mine || mine.status !== 'REGISTERED') return { error: "You're not registered for this session." };
  if (isPast(session.date)) return { error: 'That session has already passed.' };

  db.myTraining[sessionId] = { ...mine, status: 'CANCELLED' };
  return { success: true };
}
