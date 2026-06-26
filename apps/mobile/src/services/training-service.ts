/**
 * Training service (mock). Mirrors `getAvailableTraining`,
 * `registerForTraining` and `cancelTrainingRegistration` in the web app.
 */

import { db, isPast, nextId, type TrainingRecord } from '@/data/mock-db';
import type { ActionResult, TrainingSessionWithDetails } from '@/types/models';

import { delay } from './client';

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
  return db.training
    .filter((t) => !isPast(t.date))
    .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime))
    .map(toDetails);
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
