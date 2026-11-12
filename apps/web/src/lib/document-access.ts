/**
 * Who may open a stored file.
 *
 * Files on a volunteer's record (vetting forms, scanned training sign-offs)
 * are held by the kitchen team and attached by staff - volunteers never upload
 * them - so they are staff-only, the volunteer included. Everyone signed in may
 * open the org-wide material meant for volunteers: policies and training
 * material.
 */
const VOLUNTEER_READABLE_TYPES: readonly string[] = ["POLICY", "TRAINING_MATERIAL"];

export function canDownloadDocument(
  viewer: { isStaff: boolean },
  doc: { type: string; volunteerId: string | null }
): boolean {
  if (viewer.isStaff) return true;
  return doc.volunteerId === null && VOLUNTEER_READABLE_TYPES.includes(doc.type);
}
