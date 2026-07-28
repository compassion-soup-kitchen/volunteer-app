/**
 * Wire-format mapping for the mobile API (`/api/v1/*`).
 *
 * The mobile app's domain types (apps/mobile/src/types/models.ts) are the
 * contract: dates go out as `YYYY-MM-DD` strings, timestamps as ISO datetimes,
 * and service areas as `{ id, name }` objects. Keep these serializers in sync
 * with the mobile types when either side changes.
 */

import type {
  DashboardData,
  VolunteerHoursData,
} from "@/lib/data/volunteer-dashboard";
import type {
  ScheduleEntry,
  ShiftWithDetails,
} from "@/lib/data/volunteer-shifts";
import type {
  TrainingHistoryItem,
  VolunteerTrainingSession,
} from "@/lib/data/volunteer-training";
import type { AnnouncementSummary } from "@/lib/data/announcements";
import type { getProfileForUser } from "@/lib/data/volunteer-profile";
import { getMilestones } from "@/lib/milestones";
import { timestampToDateOnly } from "@/lib/date-only";
import type { ApiUser } from "./auth";

/** `Shift.date` is `@db.Date` (UTC midnight), so the ISO date part is exact. */
export function dateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * For columns that are real timestamps rather than `@db.Date` — the calendar
 * day they land on is a question about Wellington, not UTC.
 */
function timestampDay(at: Date): string {
  return timestampToDateOnly(at);
}

// ─── Shifts ─────────────────────────────────────────────

export function serializeShift(shift: ShiftWithDetails) {
  return {
    id: shift.id,
    date: dateOnly(shift.date),
    startTime: shift.startTime,
    endTime: shift.endTime,
    capacity: shift.capacity,
    notes: shift.notes,
    serviceArea: shift.serviceArea,
    signupCount: shift.signupCount,
    userSignupId: shift.userSignupId,
    userSignupStatus: shift.userSignupStatus,
    // Right of first refusal. Older app versions ignore these; the signup
    // endpoint enforces the hold either way.
    offersCloseOn: shift.offersCloseOn ? dateOnly(shift.offersCloseOn) : null,
    heldForOffers: shift.heldForOffers,
    userOfferStatus: shift.userOfferStatus,
  };
}

export function serializeScheduleEntry(entry: ScheduleEntry) {
  return {
    id: entry.id,
    date: dateOnly(entry.date),
    startTime: entry.startTime,
    endTime: entry.endTime,
    areaName: entry.areaName,
    status: entry.status,
  };
}

// ─── Dashboard / Hours ──────────────────────────────────

export function serializeDashboard(data: DashboardData) {
  const rosterShift = (shift: DashboardData["upcomingShifts"][number]) => ({
    id: shift.id,
    date: dateOnly(shift.date),
    startTime: shift.startTime,
    endTime: shift.endTime,
    serviceArea: shift.serviceArea,
    notes: shift.notes,
  });

  return {
    nextShift: data.nextShift ? rosterShift(data.nextShift) : null,
    upcomingShifts: data.upcomingShifts.map(rosterShift),
    openShiftsForYou: data.openShiftsForYou.map((shift) => ({
      id: shift.id,
      date: dateOnly(shift.date),
      startTime: shift.startTime,
      endTime: shift.endTime,
      serviceArea: shift.serviceArea,
      spotsLeft: shift.spotsLeft,
    })),
    hoursThisMonth: data.hoursThisMonth,
    totalHours: data.totalHours,
    mealsThisMonth: data.mealsThisMonth,
    totalMeals: data.totalMeals,
    totalShifts: data.totalShifts,
    milestones: data.milestones,
  };
}

export function serializeHours(data: VolunteerHoursData) {
  // Already JSON-safe: aggregates, month keys, and milestones only.
  return data;
}

/** Zeroed payloads for users without a volunteer profile yet. */
export function emptyDashboard() {
  return {
    nextShift: null,
    upcomingShifts: [],
    openShiftsForYou: [],
    hoursThisMonth: 0,
    totalHours: 0,
    mealsThisMonth: 0,
    totalMeals: 0,
    totalShifts: 0,
    milestones: getMilestones(0),
  };
}

export function emptyHours() {
  return {
    totalHours: 0,
    totalShifts: 0,
    totalMeals: 0,
    hoursThisMonth: 0,
    shiftsThisMonth: 0,
    mealsThisMonth: 0,
    byServiceArea: [],
    byMonth: [],
    milestones: getMilestones(0),
  };
}

// ─── Training ───────────────────────────────────────────

export function serializeTrainingSession(session: VolunteerTrainingSession) {
  return {
    id: session.id,
    // Training types became rows, but the wire format keeps sending the key so
    // installed apps keep matching on INDUCTION / HEALTH_SAFETY / DE_ESCALATION.
    // `typeName` carries the staff-editable label for newer clients.
    type: session.type.key,
    typeName: session.type.name,
    title: session.title,
    description: session.description ?? "",
    date: dateOnly(session.date),
    startTime: session.startTime,
    endTime: session.endTime,
    capacity: session.capacity,
    location: session.location,
    registeredCount: session.registeredCount,
    userAttendanceId: session.userAttendanceId,
    userAttendanceStatus: session.userAttendanceStatus,
  };
}

export function serializeTrainingHistoryItem(item: TrainingHistoryItem) {
  return {
    id: item.id,
    type: item.type.key,
    typeName: item.type.name,
    title: item.title,
    date: dateOnly(item.date),
    status: item.status,
  };
}

// ─── Announcements ──────────────────────────────────────

export function serializeAnnouncement(announcement: AnnouncementSummary) {
  return {
    id: announcement.id,
    title: announcement.title,
    body: announcement.body,
    audience: announcement.audience,
    authorName: announcement.authorName ?? "Te Pūaroha",
    publishedAt: announcement.sentAt.toISOString(),
    // The web app has no pinning yet; the mobile feed sorts pinned first.
    pinned: false,
  };
}

// ─── Profile ────────────────────────────────────────────

type ProfileWithRelations = NonNullable<
  Awaited<ReturnType<typeof getProfileForUser>>
>;

export function serializeProfile(
  profile: ProfileWithRelations,
  user: ApiUser,
  trainingHistory: TrainingHistoryItem[]
) {
  return {
    id: profile.id,
    name: user.name ?? "",
    email: user.email,
    phone: profile.phone,
    address: profile.address,
    dateOfBirth: profile.dateOfBirth
      ? timestampDay(profile.dateOfBirth)
      : null,
    bio: profile.bio,
    skills: profile.skills,
    emergencyContactName: profile.emergencyContactName,
    emergencyContactPhone: profile.emergencyContactPhone,
    emergencyContactRelationship: profile.emergencyContactRelationship,
    status: profile.status,
    mojStatus: profile.mojStatus,
    interests: profile.interests.map((area) => ({
      id: area.id,
      name: area.name,
      description: area.description,
    })),
    memberSince: timestampDay(profile.createdAt),
    trainingHistory: trainingHistory.map(serializeTrainingHistoryItem),
  };
}

// ─── Session user ───────────────────────────────────────

export function serializeSessionUser(user: ApiUser) {
  return {
    id: user.id,
    name: user.name ?? "",
    email: user.email,
    image: user.image,
    role: user.role,
  };
}
