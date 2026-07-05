/**
 * Profile service. Mirrors `getVolunteerProfile` and `updateVolunteerProfile`
 * in the web app; against the real API it calls `/api/v1/profile`.
 */

import { db, SEED_USER } from '@/data/mock-db';
import type { ActionResult, ProfileUpdate, ServiceArea, VolunteerProfile } from '@/types/models';

import { getStoredSession } from './auth-service';
import { apiFetch, ApiError, delay, toActionError, USE_MOCK } from './client';

/**
 * A minimal profile for users who haven't applied yet (the API has no
 * VolunteerProfile row for them until the application is submitted).
 */
async function stubProfile(): Promise<VolunteerProfile> {
  const user = await getStoredSession();
  return {
    id: user?.id ?? '',
    name: user?.name ?? '',
    email: user?.email ?? '',
    phone: null,
    address: null,
    dateOfBirth: null,
    bio: null,
    skills: [],
    emergencyContactName: null,
    emergencyContactPhone: null,
    emergencyContactRelationship: null,
    status: 'APPLICATION_SUBMITTED',
    mojStatus: 'NOT_STARTED',
    interests: [],
    memberSince: new Date().toISOString().slice(0, 10),
    trainingHistory: [],
  };
}

export async function getVolunteerProfile(): Promise<VolunteerProfile> {
  if (!USE_MOCK) {
    try {
      return await apiFetch<VolunteerProfile>('/api/v1/profile');
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return stubProfile();
      throw err;
    }
  }

  await delay();
  const user = db.session ?? SEED_USER;
  const interests: ServiceArea[] = db.profile.interestIds
    .map((id) => db.serviceAreas.find((a) => a.id === id))
    .filter((a): a is ServiceArea => Boolean(a));

  return {
    id: db.profile.id,
    name: user.name,
    email: user.email,
    phone: db.profile.phone,
    address: db.profile.address,
    dateOfBirth: db.profile.dateOfBirth,
    bio: db.profile.bio,
    skills: db.profile.skills,
    emergencyContactName: db.profile.emergencyContactName,
    emergencyContactPhone: db.profile.emergencyContactPhone,
    emergencyContactRelationship: db.profile.emergencyContactRelationship,
    status: 'ACTIVE',
    mojStatus: 'CLEARED',
    interests,
    memberSince: db.profile.memberSince,
    trainingHistory: db.pastTraining,
  };
}

export async function updateVolunteerProfile(update: ProfileUpdate): Promise<ActionResult> {
  if (!USE_MOCK) {
    // The API takes strings only; drop untouched fields and clear with ''.
    const body: Record<string, string> = {};
    for (const [key, value] of Object.entries(update)) {
      if (value !== undefined) body[key] = value ?? '';
    }

    try {
      return await apiFetch<ActionResult>('/api/v1/profile', {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
    } catch (err) {
      return toActionError(err);
    }
  }

  await delay();
  if (update.phone !== undefined) db.profile.phone = update.phone ?? '';
  if (update.address !== undefined) db.profile.address = update.address ?? '';
  if (update.bio !== undefined) db.profile.bio = update.bio ?? '';
  if (update.emergencyContactName !== undefined)
    db.profile.emergencyContactName = update.emergencyContactName ?? '';
  if (update.emergencyContactPhone !== undefined)
    db.profile.emergencyContactPhone = update.emergencyContactPhone ?? '';
  if (update.emergencyContactRelationship !== undefined)
    db.profile.emergencyContactRelationship = update.emergencyContactRelationship ?? '';
  return { success: true };
}
