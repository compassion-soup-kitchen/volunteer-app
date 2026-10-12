/**
 * Pure rules for staff-managed agreements.
 *
 * Agreements used to be four fixed enum values. They are now records staff
 * create, so the parts that decide a key, whether someone still owes an
 * acknowledgement, and how the counts add up live here where they can be
 * tested without a database.
 */

export const AGREEMENT_KEY_MAX_LENGTH = 64;

/**
 * A stable key for an agreement, derived from its title.
 *
 * SCREAMING_SNAKE to match the four that predate staff-managed agreements
 * (`CODE_OF_CONDUCT`, `SAFEGUARDING`, ...) - the column holds both old and new,
 * so one convention beats a tidier-looking slug that splits the data in two.
 */
export function agreementKeyFromTitle(title: string): string {
  const key = title
    .normalize("NFD")
    // Strip diacritics so "Pānui" keys as PANUI rather than losing the vowel.
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, AGREEMENT_KEY_MAX_LENGTH)
    .replace(/_+$/g, "");

  return key || "AGREEMENT";
}

/**
 * The same, but stepped past keys already in use.
 *
 * Two policies can legitimately share a title after a rename, and the key is
 * unique in the database - so collide loudly here rather than at the insert.
 */
export function uniqueAgreementKey(
  title: string,
  taken: Iterable<string>
): string {
  const used = new Set(taken);
  const base = agreementKeyFromTitle(title);
  if (!used.has(base)) return base;

  for (let n = 2; n < 1000; n++) {
    const suffix = `_${n}`;
    const candidate =
      base.slice(0, AGREEMENT_KEY_MAX_LENGTH - suffix.length) + suffix;
    if (!used.has(candidate)) return candidate;
  }

  throw new Error("Could not find a free key for this agreement.");
}

export type AgreementTemplateRules = {
  version: string;
  requiresReAck: boolean;
  reAckSetAt: Date | null;
};

export type SignatureRecord = {
  documentVersion: string | null;
  signedAt: Date;
};

/**
 * Whether a volunteer still owes an acknowledgement.
 *
 * Two separate reasons, and they are not the same thing:
 *   - they have never acknowledged this agreement, or
 *   - staff have asked everyone to re-acknowledge and their tick predates that.
 *
 * A bare version bump deliberately does *not* force a re-tick - staff fix a
 * typo far more often than they change what people are agreeing to, and
 * `requiresReAck` is the switch for when it really is a new promise.
 */
export function needsAcknowledgement(
  template: AgreementTemplateRules,
  latest: SignatureRecord | null | undefined
): boolean {
  if (!latest) return true;
  if (!template.requiresReAck || !template.reAckSetAt) return false;
  return latest.signedAt < template.reAckSetAt;
}

/** Whether a signature is against the version currently published. */
export function isCurrentVersion(
  template: Pick<AgreementTemplateRules, "version">,
  latest: SignatureRecord | null | undefined
): boolean {
  return !!latest && latest.documentVersion === template.version;
}

export type AgreementTally = {
  totalVolunteers: number;
  /**
   * How many are square with this agreement right now - the number a
   * coordinator is actually asking about. Not the same as `signedCurrentCount`,
   * which only compares version strings: after staff ask everyone to confirm
   * again, all four can be on the current version and three can still owe a
   * reply, which read as "4/4 signed" beside "3 to confirm".
   */
  confirmedCount: number;
  signedCurrentCount: number;
  signedOutdatedCount: number;
  unsignedCount: number;
  pendingReAckCount: number;
};

/**
 * How an agreement is tracking across the people it applies to.
 *
 * `latestPerVolunteer` must cover exactly the volunteers counted in
 * `totalVolunteers` and no one else. That is the whole point of taking it as a
 * list rather than a count: the counts used to be drawn from two different
 * populations - staff were excluded from the denominator but their old
 * signatures still landed in the numerator - which is how the page came to read
 * "8 / 6 signed current" and a negative number of unsigned volunteers.
 */
export function tallyAgreement(
  template: AgreementTemplateRules,
  latestPerVolunteer: (SignatureRecord | null)[]
): AgreementTally {
  const totalVolunteers = latestPerVolunteer.length;

  let signedCurrentCount = 0;
  let signedOutdatedCount = 0;
  let pendingReAckCount = 0;

  for (const latest of latestPerVolunteer) {
    if (isCurrentVersion(template, latest)) signedCurrentCount++;
    else if (latest?.documentVersion) signedOutdatedCount++;

    if (needsAcknowledgement(template, latest)) pendingReAckCount++;
  }

  return {
    totalVolunteers,
    confirmedCount: totalVolunteers - pendingReAckCount,
    signedCurrentCount,
    signedOutdatedCount,
    unsignedCount: totalVolunteers - signedCurrentCount - signedOutdatedCount,
    pendingReAckCount,
  };
}

export type AgreementTemplateInput = {
  title: string;
  content: string;
  version: string;
  requiresSignature: boolean;
};

/**
 * Validation shared by creating and editing an agreement.
 *
 * Returns the first problem in reading order, or null when it is good to save.
 */
export function validateAgreementTemplate(
  input: AgreementTemplateInput
): string | null {
  if (!input.title.trim()) return "Give the agreement a title.";
  if (input.title.trim().length > 120)
    return "Keep the title under 120 characters.";
  if (!input.content.trim()) return "Add the wording volunteers will agree to.";
  if (!input.version.trim()) return "Give the agreement a version.";
  if (input.version.trim().length > 20)
    return "Keep the version under 20 characters.";
  return null;
}
