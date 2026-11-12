/**
 * Who may open a stored file.
 *
 * Files on a volunteer's record (vetting forms, scanned training sign-offs)
 * are held by the kitchen team and attached by staff - volunteers never upload
 * them - so they are staff-only, the volunteer included. Everyone signed in may
 * open the org-wide material meant for volunteers: policies and training
 * material.
 *
 * `ORG_FILE_TYPES` is also all the file manager may create: an org-wide file
 * with no volunteer only makes sense as something volunteers can read. Files
 * about one person go on their record (`VOLUNTEER_FILE_TYPES`).
 */
export const ORG_FILE_TYPES = ["POLICY", "TRAINING_MATERIAL"] as const;

const VOLUNTEER_READABLE_TYPES: readonly string[] = ORG_FILE_TYPES;

export function canDownloadDocument(
  viewer: { isStaff: boolean },
  doc: { type: string; volunteerId: string | null }
): boolean {
  if (viewer.isStaff) return true;
  return doc.volunteerId === null && VOLUNTEER_READABLE_TYPES.includes(doc.type);
}
