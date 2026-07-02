import type { ApplicationSubmission, Availability } from '@/types/models';

/** Everything the wizard collects, in edit-friendly shape. */
export interface ApplicationDraft {
  phone: string;
  address: string;
  /** As typed, `DD/MM/YYYY` (optional). */
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

/** `DD/MM/YYYY` → ISO `YYYY-MM-DD`, or null when the input doesn't parse. */
export function dobToIso(input: string): string | null {
  const m = input.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, d, mo, y] = m;
  const day = Number(d);
  const month = Number(mo);
  const year = Number(y);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function draftToSubmission(draft: ApplicationDraft): ApplicationSubmission {
  return {
    phone: draft.phone.trim(),
    address: draft.address.trim(),
    dateOfBirth: dobToIso(draft.dateOfBirth) ?? '',
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
