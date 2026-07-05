/**
 * Volunteer application service. Mirrors `submitApplication` and
 * `getUserApplicationStatus` in the web app's `application-actions.ts`;
 * against the real API it calls `/api/v1/application`.
 */

import { db } from '@/data/mock-db';
import type { ActionResult, ApplicationSubmission, MyApplication } from '@/types/models';

import { apiFetch, delay, toActionError, USE_MOCK } from './client';

/** The signed-in user's application, or `null` if they haven't applied yet. */
export async function getMyApplication(): Promise<MyApplication | null> {
  if (!USE_MOCK) return apiFetch<MyApplication | null>('/api/v1/application');

  await delay();
  if (!db.application) return null;
  const { status, submittedAt, notes } = db.application;
  return { status, submittedAt, notes };
}

/** Server-side style validation - the last line of defence behind the wizard's per-step checks. */
function validate(data: ApplicationSubmission): string | null {
  if (!data.phone.trim()) return 'Please add a phone number.';
  if (!data.address.trim()) return 'Please add your address.';
  if (!data.emergencyContactName.trim() || !data.emergencyContactPhone.trim() || !data.emergencyContactRelationship.trim())
    return 'Please complete your emergency contact.';
  if (Object.values(data.availability).every((slots) => !slots || slots.length === 0))
    return 'Please pick at least one time you are available.';
  if (data.serviceAreaIds.length === 0) return 'Please choose at least one area of mahi.';
  const signed = new Set(data.agreements.filter((a) => a.signatureData.trim()).map((a) => a.type));
  if (!signed.has('CODE_OF_CONDUCT') || !signed.has('SAFEGUARDING'))
    return 'Please sign both agreements.';
  return null;
}

export async function submitApplication(data: ApplicationSubmission): Promise<ActionResult> {
  const error = validate(data);
  if (error) return { error };

  if (!USE_MOCK) {
    try {
      return await apiFetch<ActionResult>('/api/v1/application', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch (err) {
      return toActionError(err);
    }
  }

  await delay(480);
  if (!db.session) return { error: 'Please sign in to submit your application.' };
  if (db.application) return { error: 'You have already submitted an application.' };

  db.application = {
    status: 'PENDING',
    submittedAt: new Date().toISOString(),
    notes: null,
    data,
  };

  // Reflect the application into the profile store, as the web app does when
  // it creates the VolunteerProfile - so an approved volunteer's profile is
  // already filled in.
  db.profile = {
    ...db.profile,
    id: db.session.id,
    phone: data.phone,
    address: data.address,
    dateOfBirth: data.dateOfBirth,
    bio: data.bio,
    skills: data.skills,
    emergencyContactName: data.emergencyContactName,
    emergencyContactPhone: data.emergencyContactPhone,
    emergencyContactRelationship: data.emergencyContactRelationship,
    interestIds: data.serviceAreaIds,
  };

  return { success: true };
}
