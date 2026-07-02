import type { ApplicationSubmission, Availability } from '@/types/models';

/** Everything the wizard collects, in edit-friendly shape. */
export interface ApplicationDraft {
  phone: string;
  address: string;
  /** ISO `YYYY-MM-DD` from the date picker, or empty (optional). */
  dateOfBirth: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship: string;
  availability: Availability;
  serviceAreaIds: string[];
  skills: string[];
  bio: string;
  cocAgreed: boolean;
  cocSignature: string;
  safeguardingAgreed: boolean;
  safeguardingSignature: string;
}

export const EMPTY_DRAFT: ApplicationDraft = {
  phone: '',
  address: '',
  dateOfBirth: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  emergencyContactRelationship: '',
  availability: {},
  serviceAreaIds: [],
  skills: [],
  bio: '',
  cocAgreed: false,
  cocSignature: '',
  safeguardingAgreed: false,
  safeguardingSignature: '',
};

export function draftToSubmission(draft: ApplicationDraft): ApplicationSubmission {
  return {
    phone: draft.phone.trim(),
    address: draft.address.trim(),
    dateOfBirth: draft.dateOfBirth,
    emergencyContactName: draft.emergencyContactName.trim(),
    emergencyContactPhone: draft.emergencyContactPhone.trim(),
    emergencyContactRelationship: draft.emergencyContactRelationship.trim(),
    availability: draft.availability,
    serviceAreaIds: draft.serviceAreaIds,
    skills: draft.skills,
    bio: draft.bio.trim(),
    agreements: [
      { type: 'CODE_OF_CONDUCT', signatureData: draft.cocSignature.trim() },
      { type: 'SAFEGUARDING', signatureData: draft.safeguardingSignature.trim() },
    ],
  };
}
