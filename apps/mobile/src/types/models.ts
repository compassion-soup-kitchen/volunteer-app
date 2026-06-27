/**
 * Domain types for the volunteer app.
 *
 * These mirror the shapes returned by the web app's Server Actions
 * (`apps/web/src/lib/*-actions.ts`) and the underlying Prisma models, so the
 * mobile service layer can swap from mock fixtures to the real API without the
 * screens changing. Dates are ISO strings (`YYYY-MM-DD` for calendar dates),
 * times are `HH:mm` strings.
 */

export type Role = 'PUBLIC' | 'VOLUNTEER' | 'COORDINATOR' | 'ADMIN';

export type VolunteerStatus =
  | 'APPLICATION_SUBMITTED'
  | 'AWAITING_VETTING'
  | 'APPROVED_FOR_INDUCTION'
  | 'ACTIVE'
  | 'INACTIVE';

export type MojStatus = 'NOT_STARTED' | 'SUBMITTED' | 'CLEARED' | 'FLAGGED';

export type ApplicationStatus = 'PENDING' | 'APPROVED' | 'DECLINED' | 'INFO_REQUESTED';

export type SignupStatus = 'SIGNED_UP' | 'ATTENDED' | 'NO_SHOW' | 'CANCELLED';

export type AttendanceStatus = 'REGISTERED' | 'ATTENDED' | 'NO_SHOW' | 'CANCELLED';

export type TrainingType = 'INDUCTION' | 'DE_ESCALATION' | 'HEALTH_SAFETY' | 'OTHER';

/* -------------------------------------------------------------------------- */
/*  Auth                                                                       */
/* -------------------------------------------------------------------------- */

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role: Role;
}

/* -------------------------------------------------------------------------- */
/*  Reference data                                                             */
/* -------------------------------------------------------------------------- */

export interface ServiceArea {
  id: string;
  name: string;
  /** Te Reo name shown alongside the English label */
  maori?: string;
  description?: string | null;
}

export interface Milestone {
  hours: number;
  label: string;
  /** Te Reo honorific awarded at this milestone */
  term: string;
  reached: boolean;
}

/* -------------------------------------------------------------------------- */
/*  Shifts                                                                     */
/* -------------------------------------------------------------------------- */

export interface ShiftServiceArea {
  id: string;
  name: string;
  maori?: string;
}

/** A shift on the volunteer's personal roster (signed up, upcoming). */
export interface RosterShift {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  serviceArea: ShiftServiceArea;
  notes?: string | null;
}

/** An open shift surfaced to the volunteer because it matches their interests. */
export interface OpenShift {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  serviceArea: ShiftServiceArea;
  spotsLeft: number;
}

/** Full shift detail for the browse + sign-up experience. */
export interface ShiftWithDetails {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  notes?: string | null;
  serviceArea: ShiftServiceArea;
  signupCount: number;
  userSignupId: string | null;
  userSignupStatus: SignupStatus | null;
}

export interface ShiftFilters {
  serviceAreaId?: string;
}

/* -------------------------------------------------------------------------- */
/*  Training                                                                   */
/* -------------------------------------------------------------------------- */

export interface TrainingSessionWithDetails {
  id: string;
  type: TrainingType;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  location?: string | null;
  registeredCount: number;
  userAttendanceId: string | null;
  userAttendanceStatus: AttendanceStatus | null;
}

export interface TrainingHistoryItem {
  id: string;
  type: TrainingType;
  title: string;
  date: string;
  status: AttendanceStatus;
}

/** Where a volunteer stands on a single required (core) training module. */
export type TrainingModuleState = 'COMPLETE' | 'BOOKED' | 'NOT_STARTED';

export interface TrainingModule {
  type: TrainingType;
  label: string;
  state: TrainingModuleState;
  /** Completed-on date (COMPLETE) or the booked session date (BOOKED). */
  date: string | null;
}

/** The volunteer's overall standing against the required training curriculum. */
export interface TrainingReadiness {
  total: number;
  complete: number;
  booked: number;
  /** True once every core module is complete. */
  fullyTrained: boolean;
  modules: TrainingModule[];
}

/** An available/registered session, tagged with how it relates to the curriculum. */
export interface TrainingListItem extends TrainingSessionWithDetails {
  /** Part of the required core curriculum. */
  core: boolean;
  /** Core, not yet completed and not yet booked — an outstanding requirement. */
  recommended: boolean;
  /** The volunteer has completed this type before — this session is a refresher. */
  refresher: boolean;
}

/** Everything the Training tab needs in one shaped payload. */
export interface TrainingOverview {
  readiness: TrainingReadiness;
  /** Upcoming sessions the volunteer is registered for, soonest first. */
  registered: TrainingListItem[];
  /** Upcoming sessions open to register for, soonest first. */
  available: TrainingListItem[];
  /** Sessions attended in the past, most recent first. */
  completed: TrainingHistoryItem[];
}

/* -------------------------------------------------------------------------- */
/*  Dashboard + hours                                                          */
/* -------------------------------------------------------------------------- */

export interface DashboardData {
  nextShift: RosterShift | null;
  upcomingShifts: RosterShift[];
  openShiftsForYou: OpenShift[];
  hoursThisMonth: number;
  totalHours: number;
  mealsThisMonth: number;
  totalMeals: number;
  totalShifts: number;
  milestones: Milestone[];
}

export interface HoursByArea {
  serviceAreaId: string;
  serviceAreaName: string;
  hours: number;
  shifts: number;
  meals: number;
}

export interface HoursByMonth {
  /** `YYYY-MM` */
  month: string;
  label: string;
  hours: number;
  shifts: number;
  meals: number;
}

export interface VolunteerHoursData {
  totalHours: number;
  totalShifts: number;
  totalMeals: number;
  hoursThisMonth: number;
  shiftsThisMonth: number;
  mealsThisMonth: number;
  byServiceArea: HoursByArea[];
  byMonth: HoursByMonth[];
  milestones: Milestone[];
}

/* -------------------------------------------------------------------------- */
/*  Profile                                                                    */
/* -------------------------------------------------------------------------- */

export interface VolunteerProfile {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  dateOfBirth?: string | null;
  bio?: string | null;
  skills: string[];
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRelationship?: string | null;
  status: VolunteerStatus;
  mojStatus: MojStatus;
  interests: ServiceArea[];
  /** ISO date the volunteer joined */
  memberSince: string;
  trainingHistory: TrainingHistoryItem[];
}

export type ProfileUpdate = Partial<
  Pick<
    VolunteerProfile,
    | 'phone'
    | 'address'
    | 'bio'
    | 'emergencyContactName'
    | 'emergencyContactPhone'
    | 'emergencyContactRelationship'
  >
>;

/* -------------------------------------------------------------------------- */
/*  Action results                                                             */
/* -------------------------------------------------------------------------- */

export interface ActionResult {
  success?: boolean;
  error?: string;
}
