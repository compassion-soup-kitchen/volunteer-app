/**
 * Profile service (mock). Mirrors `getVolunteerProfile` and
 * `updateVolunteerProfile` in the web app.
 */

import { db, SEED_USER } from '@/data/mock-db';
import type { ActionResult, ProfileUpdate, ServiceArea, VolunteerProfile } from '@/types/models';

import { delay } from './client';

export async function getVolunteerProfile(): Promise<VolunteerProfile> {
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
