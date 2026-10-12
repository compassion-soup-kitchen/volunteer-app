/**
 * One name per agreement, wherever it appears.
 *
 * The same document is listed on the staff templates page, in a volunteer's own
 * documents, and on their record in the directory - it read differently in each
 * before this, which made "Te Tikanga" look like two separate policies.
 */
const AGREEMENT_LABELS: Record<string, string> = {
  CODE_OF_CONDUCT: "Te Tikanga · Code of Conduct",
  SAFEGUARDING: "Safeguarding Policy",
  VOLUNTEER_APPLICATION: "Volunteer Application Agreement",
  POLICIES: "General Policies",
};

/**
 * The human name for an agreement type.
 *
 * Pass the template's own `title` as `fallback` wherever one is to hand -
 * agreements staff add are named by them, and only the four founding ones have
 * an entry here. Failing that, the key is sentence-cased, so the worst case is
 * "Media consent" rather than a raw SCREAMING_SNAKE value.
 */
export function agreementLabel(
  agreementType: string,
  fallback?: string | null
): string {
  const known = AGREEMENT_LABELS[agreementType];
  if (known) return known;
  if (fallback) return fallback;

  const words = agreementType.replaceAll("_", " ").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
