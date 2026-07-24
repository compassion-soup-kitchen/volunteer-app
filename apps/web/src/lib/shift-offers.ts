/**
 * Right of first refusal.
 *
 * Regular crews build up around particular shifts, and the roster should hold
 * those patterns rather than throwing every shift open the moment it is
 * created. Staff can offer a shift to named volunteers and hold it for them
 * through a chosen day; until then nobody else can take it. The hold ends
 * early the moment everyone offered has answered — a shift nobody wants
 * shouldn't sit locked while the deadline runs down.
 */

import { dateOnlyOf, formatDateOnly, todayInAppZone } from "@/lib/date-only";

export type OfferStatus = "PENDING" | "ACCEPTED" | "DECLINED";

/** The parts of a shift that decide who may sign up right now. */
export type FirstRefusalState = {
  /** Held through the end of this day. `null` — the shift is open to all. */
  offersCloseOn: Date | null;
  offers: { status: OfferStatus }[];
};

/**
 * Whether the shift is still being held for the volunteers it was offered
 * to: the hold day hasn't passed and at least one of them has yet to answer.
 */
export function isHeldForOffers(
  shift: FirstRefusalState,
  now: Date = new Date()
): boolean {
  if (!shift.offersCloseOn) return false;
  if (dateOnlyOf(shift.offersCloseOn) < todayInAppZone(now)) return false;
  return shift.offers.some((offer) => offer.status === "PENDING");
}

/** "held until Friday, 28 August" — the phrase both sides of the app use. */
export function formatHoldUntil(offersCloseOn: Date): string {
  return formatDateOnly(offersCloseOn, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/** What a volunteer who wasn't offered the shift is told when they try. */
export function heldForOffersMessage(offersCloseOn: Date): string {
  return `This shift is being offered to our regular crew first. It opens to everyone after ${formatHoldUntil(offersCloseOn)}.`;
}

export type OfferWindowInput = {
  /** The shift's day, as `YYYY-MM-DD`. */
  shiftDate: string;
  /** The hold day, as `YYYY-MM-DD`, or `null` for no first refusal. */
  offersCloseOn: string | null;
  volunteerIds: string[];
  today: string;
  /**
   * The hold day already stored on the shift, when editing. A hold that has
   * since lapsed is history, not a mistake — carrying it through unchanged
   * has to stay legal, or a shift whose offer closed last week could never
   * be edited again.
   */
  existingOffersCloseOn?: string | null;
};

export type OfferWindowResult =
  | { ok: true; offersCloseOn: string | null; volunteerIds: string[] }
  | { ok: false; error: string };

/**
 * Validates a staff-chosen first-refusal window. Offering to nobody and
 * holding until nothing are the same thing — no first refusal — so either
 * one on its own clears the whole arrangement rather than half-applying it.
 */
export function resolveOfferWindow(input: OfferWindowInput): OfferWindowResult {
  const volunteerIds = Array.from(new Set(input.volunteerIds));

  if (volunteerIds.length === 0) {
    return { ok: true, offersCloseOn: null, volunteerIds: [] };
  }

  if (!input.offersCloseOn) {
    return {
      ok: false,
      error: "Choose the day the offer is held until.",
    };
  }

  const holdIsUnchanged = input.offersCloseOn === input.existingOffersCloseOn;
  if (input.offersCloseOn < input.today && !holdIsUnchanged) {
    return {
      ok: false,
      error: "The offer can't be held until a day that has already passed.",
    };
  }

  if (input.offersCloseOn > input.shiftDate) {
    return {
      ok: false,
      error: "The offer must close on or before the day of the shift.",
    };
  }

  return { ok: true, offersCloseOn: input.offersCloseOn, volunteerIds };
}

/**
 * How a volunteer sees a shift they were offered. `PENDING` on a shift whose
 * hold has lapsed is no longer a live offer — they can still sign up, just
 * without a spot reserved for them.
 */
export function offerIsLive(
  offer: { status: OfferStatus } | null,
  shift: FirstRefusalState,
  now: Date = new Date()
): boolean {
  return offer?.status === "PENDING" && isHeldForOffers(shift, now);
}
