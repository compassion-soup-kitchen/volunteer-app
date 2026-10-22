# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Compassion Soup Kitchen - Volunteer App

## Project
Volunteer management app for Compassion Soup Kitchen (Te Pūaroha), Wellington, NZ.
~100 volunteers. Mobile-first for volunteers, desktop for staff (coordinators/admins).

The app handles the full volunteer lifecycle: public signup → application review → MoJ vetting → induction → active rostering → attendance, training, hours tracking, document management, and announcements.

## Monorepo Layout

This is a **pnpm + Turborepo monorepo**. The detailed sections below describe **`apps/web`** unless noted — all `src/...` and `prisma/...` paths in this file are relative to `apps/web/`.

```
apps/
├── web/      # Next.js 16 staff + volunteer web app (the primary product — most of this doc)
└── mobile/   # Expo SDK 56 React Native app for volunteers (mock-first; see apps/mobile/AGENTS.md)
packages/     # Shared workspace packages (currently none beyond a placeholder)
```

- **Workspaces**: `pnpm-workspace.yaml` globs `apps/*` + `packages/*`. Task running via `turbo.json` (`build` depends on `^build` + `db:generate`; `e2e` depends on `build`).
- **React is pinned workspace-wide to `19.2.3`** (`overrides` in `pnpm-workspace.yaml`) — mobile's `react-native-renderer` (Expo SDK 56 / RN 0.85.3) requires an exact match, and the hoisted single `react` would otherwise pull web's newer version into mobile and crash it at launch. Do not bump `react`/`react-dom` in one app only.
- **Root scripts** (`package.json`) fan out via Turbo across all apps: `pnpm run dev | build | lint | typecheck | test | test:ci | e2e | e2e:ci`.
- **Use Turbo for any task with deps.** `build`, `typecheck`, `lint`, `test`, and `test:ci` depend directly on `db:generate` (and `build` + `typecheck` additionally on `^build`, i.e. workspace-package builds); `e2e`/`e2e:ci` depend on `build`, which transitively pulls in `db:generate`. Those deps only run when **Turbo** is the runner. Use `pnpm run build` (all apps) or `turbo run build --filter=web` (web only). The `pnpm web <script>` / `pnpm mobile <script>` shortcuts expand to `pnpm --filter <app> run <script>`, which call the package script **directly and bypass Turbo** — so `pnpm web typecheck`, `pnpm web lint`, `pnpm web test`, and `pnpm web test:ci` silently skip `db:generate` (stale Prisma types), and `pnpm web e2e` / `pnpm web e2e:ci` skip the `build` dep (stale or absent `.next/`). (`pnpm web build` is safe from stale types because its script embeds `prisma generate &&`, but it still skips Turbo caching and the `^build` workspace-package dep.) The shortcuts are otherwise fine for dep-free scripts: `pnpm web dev`, `pnpm web db:studio`, etc.

## Stack
- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript
- **Styling**: Tailwind v4 + shadcn/ui (preset `aw5FzQe`, style `radix-lyra`, base `mist`, icon library `remixicon`)
- **DB**: Prisma 7 ORM → self-hosted PostgreSQL (Coolify-managed) via `@prisma/adapter-pg` + `pg` Pool. Migrations via `prisma migrate` (history in `prisma/migrations/`); `prisma migrate deploy` runs on container start.
- **Storage**: Cloudflare R2, reached over its S3-compatible API through the AWS S3 SDK in `src/lib/storage.ts`. Any S3-compatible backend works; only env values change. `pnpm run storage:check` round-trips a real object to prove the config.
- **Auth**: NextAuth v5 (beta) — Credentials + Google providers, JWT sessions, PrismaAdapter
- **Email**: Resend HTTP API via `src/lib/email.ts` (plain fetch, no SDK; sending is skipped when `RESEND_API_KEY` is unset)
- **Animation**: `motion/react`
- **Forms/UI**: `react-day-picker`, `recharts`, `sonner` (toasts), `radix-ui`, `class-variance-authority`, `tailwind-merge`
- **Validation**: `zod`
- **Testing**: Vitest + React Testing Library + jsdom for unit/component; Playwright (chromium) for E2E
- **Other**: `bcryptjs` (password hashing), `date-fns`, `next-themes`

## Skill Usage (REQUIRED)

When building or modifying UI/UX:
- **`ui-ux-pro-max:ui-ux-pro-max`** — invoke for design intelligence (styles, palettes, font pairings, layout patterns, accessibility, interaction states). Use for any visual work: components, pages, dashboards, forms, charts.
- **`frontend-design:frontend-design`** — invoke when creating distinctive, production-grade frontend interfaces. Use to avoid generic AI aesthetics and produce polished, creative output.

Use these skills proactively — do not ship UI work without consulting them.

Other useful skills in this repo:
- `vercel:nextjs` — App Router, Server Components, Server Actions guidance
- `vercel:shadcn` — shadcn/ui CLI, composition, theming
- `vercel:vercel-storage` — Supabase / Marketplace storage guidance
- `vercel:auth` — auth patterns (we use NextAuth, not Clerk, but useful for middleware patterns)

## File Structure

```
apps/web/
src/
├── app/
│   ├── layout.tsx                    # Root: Hanken Grotesk/Newsreader/Geist Mono fonts, ThemeProvider, SessionProvider, TooltipProvider, Toaster
│   ├── globals.css                   # Tailwind v4 + shadcn tokens (hex), 18px root, brand red primary
│   ├── (public)/                     # Unauthenticated routes
│   │   ├── page.tsx                  # Landing page
│   │   ├── landing-nav.tsx
│   │   ├── login/
│   │   ├── register/
│   │   ├── forgot-password/          # Request a password-reset email
│   │   ├── reset-password/           # Redeem the emailed reset token
│   │   ├── verify-email/             # Redeem the emailed verification link (+ resend form)
│   │   └── privacy/                  # NZ Privacy Act statement
│   ├── (volunteer)/                  # VOLUNTEER role routes (mobile-first)
│   │   ├── layout.tsx                # Auth gate, redirects staff → /staff/dashboard
│   │   ├── volunteer-nav.tsx         # Top nav
│   │   ├── volunteer-footer.tsx      # Bottom nav (mobile)
│   │   ├── dashboard/                # Personal dashboard (next shifts, milestones, announcements)
│   │   ├── profile/                  # View profile + /edit subpage with profile-edit-form; /leave to log leave
│   │   ├── application/              # Application form (multi-step) — application-form.tsx
│   │   ├── shifts/                   # Browse & sign up — shift-browser.tsx
│   │   ├── training/                 # Browse & register — training-browser.tsx
│   │   ├── hours/                    # Personal hours log — hours-detail.tsx
│   │   ├── documents/                # View signed agreements + downloadable policies
│   │   ├── team/                     # Who's who — members of volunteer-visible groups
│   │   ├── news/                     # Announcements feed (event pānui carry their RSVP inline)
│   │   └── events/                   # Invitations + RSVP (parties, hui, working bees)
│   ├── (staff)/staff/                # COORDINATOR / ADMIN routes (desktop-first, sidebar layout)
│   │   ├── layout.tsx                # Auth gate, redirects volunteers → /dashboard
│   │   ├── staff-nav.tsx             # Sidebar nav
│   │   ├── dashboard/                # Staff overview
│   │   ├── applications/             # Review pending applications
│   │   ├── calendar/                 # Month roster view; close days (NZ public holidays suggested)
│   │   ├── volunteers/               # Volunteer directory + per-volunteer detail; /new + /[id]/edit for offline volunteers
│   │   ├── groups/                   # CRUD volunteer groups + membership (group-manager.tsx)
│   │   ├── leave/                    # Leave board: away now / coming up / recently back; log leave for anyone
│   │   ├── shifts/                   # Create/manage shifts, roster named volunteers, mark attendance,
│   │   │                             #   record meals; /repeating for repeating shifts + regulars
│   │   ├── service-areas/            # CRUD service areas
│   │   ├── training/                 # Create/manage training sessions
│   │   ├── documents/                # Upload templates, manage agreement templates
│   │   ├── announcements/            # Create/publish pānui (news for volunteers)
│   │   ├── events/                   # Create/share events, guest list, announce them
│   │   └── reports/                  # Charts & exports
│   └── api/
│       ├── auth/                     # NextAuth handlers
│       ├── health/                   # Liveness / readiness probes
│       └── v1/                       # Bearer-token JSON API for the mobile app (shifts, training,
│                                     #   announcements, events + RSVP …). The web app itself uses
│                                     #   Server Actions, never these routes.
│
├── components/
│   ├── ui/                           # shadcn primitives (alert-dialog, avatar, badge, button, calendar,
│   │                                 #   card, checkbox, dialog, dropdown-menu, input, label, popover,
│   │                                 #   progress, select, separator, skeleton, sonner, table, tabs,
│   │                                 #   textarea, tooltip)
│   ├── address-autocomplete.tsx      # NZ address autocomplete
│   ├── date-picker.tsx
│   ├── signature-pad.tsx             # For SignedAgreement.signatureData
│   ├── session-provider.tsx          # NextAuth client provider
│   ├── theme-provider.tsx            # next-themes
│   └── theme-toggle.tsx
│
├── lib/
│   ├── auth.ts                       # NextAuth config (Google + Credentials, JWT, role on session)
│   ├── db.ts                         # Lazy-init Prisma client (PrismaPg adapter, pool size via DATABASE_POOL_MAX, default 10)
│   ├── storage.ts                    # S3-compatible storage client (Cloudflare R2) - uploads/presigned URLs
│   ├── utils.ts                      # `cn()` helper (clsx + tailwind-merge)
│   ├── milestones.ts                 # Volunteer milestone definitions
│   ├── push.ts                       # Expo push notifications — batch send via exp.host, dead-token pruning
│   ├── email-templates.ts            # All transactional email copy as pure template functions (previewed at /styleguide/emails)
│   ├── email-verification.ts         # Verification-token issue/redeem + email (shared by web actions and /api/v1 register)
│   ├── auth-actions.ts               # Server Actions: login, register, email verification, password reset
│   ├── application-actions.ts        # Submit/review applications
│   ├── dashboard-actions.ts          # Volunteer dashboard data fetchers
│   ├── shift-actions.ts              # CRUD shifts, signups, staff rostering, attendance, meals
│   ├── shift-pattern-actions.ts      # Repeating shifts (ShiftPattern) + regulars: create, edit, stop
│   ├── shift-patterns.ts             # Pure pattern rules (which days, the generation window, regulars)
│   ├── shift-roster.ts               # Pure rules for staff putting a named volunteer on a shift
│   ├── closed-day-actions.ts         # Calendar month read, close/reopen days
│   ├── closed-days.ts                # Pure closure rules + month grid
│   ├── nz-public-holidays.ts         # NZ public holidays (Mondayisation, Wellington Anniversary, Matariki table)
│   ├── offline-volunteer-actions.ts  # Staff create/edit records for volunteers who don't use the app
│   ├── offline-volunteer.ts          # Pure offline-volunteer form contract
│   ├── leave.ts                      # Pure leave rules (who keeps leave, stages, which days a save touches, wording)
│   ├── leave-actions.ts              # Server Actions: log/change/end/remove leave (volunteer + staff)
│   ├── training-actions.ts           # CRUD training sessions + attendance
│   ├── service-area-actions.ts       # CRUD service areas
│   ├── group-actions.ts              # CRUD volunteer groups, membership, volunteer-facing team reads
│   ├── volunteer-groups.ts           # Pure group helpers (tones → badge variants, validation, diffing)
│   ├── document-actions.ts           # Uploads, agreement templates, signed agreements
│   ├── announcement-actions.ts       # CRUD announcements (optionally linked to an Event)
│   ├── event-actions.ts              # CRUD events, share/cancel, RSVPs, guest list, draft a pānui
│   ├── event-form.ts                 # Pure event-form contract (calendar days, times, reply deadline)
│   ├── event-rsvp.ts                 # Pure RSVP rules (who may reply, when replies close, tallies)
│   ├── staff-actions.ts              # Volunteer directory, archiving, role changes
│   └── report-actions.ts             # Aggregations / chart data
│
├── types/
│   └── next-auth.d.ts                # Augments Session.user with `role` + `sessionVersion`
│
└── proxy.ts                          # Edge proxy: public path allowlist, signed-in gate
                                       #   (which area you may use is the layouts' call)

prisma/
├── schema.prisma                     # Single source of truth (see Database section)
└── seed.ts                           # Dev seed
```

## Conventions

### Rendering
- Pages are **Server Components** — never add `"use client"` at page level.
- Wrap async data-fetching components in `<Suspense fallback={<Skeleton />}>`.
- Push `"use client"` to leaf interactive components (forms, modals, toggles, browsers).
- All mutations go through **Server Actions** (`"use server"`) in `src/lib/*-actions.ts` — not API routes. The only API route is `/api/auth` for NextAuth.
- Use `'use cache'` for shared/expensive queries (service areas, public shift list).
- Validate Server Action inputs with `zod`.
- Always call `revalidatePath` / `revalidateTag` after mutations.

### Database
- Prisma schema at `prisma/schema.prisma` — single source of truth. Run `pnpm run db:generate` after edits.
- **Migrations**: history lives in `prisma/migrations/`. After editing the schema, run `pnpm run db:migrate` to create a new migration locally. Production applies them via `prisma migrate deploy` on container start (see `Dockerfile`).
- Lazy-init pattern: import `getDb()` from `@/lib/db` (never instantiate PrismaClient elsewhere).
- All dates stored as UTC; shift `date` is `@db.Date`, times stored as `String` (HH:mm).
- **Calendar days go through `src/lib/date-only.ts`.** `@db.Date` columns (`Shift.date`, `Shift.offersCloseOn`, `TrainingSession.date`) are wall-calendar days encoded as midnight UTC, and a date picker hands back *local* midnight — so `toISOString()` on a picked date silently loses a day in NZ. Serialise with `toDateOnly`, parse with `parseDateOnly`, format with `formatDateOnly`, and answer "is it today?" with `todayInAppZone` / `isTodayInAppZone` (anchored to `Pacific/Auckland`, not the server or UTC).
- Cascade deletes on user-owned data (Account, Session, VolunteerProfile, ShiftSignup, TrainingAttendance, etc.).

### Database Models (overview)
- **Auth**: `User`, `Account`, `Session`, `VerificationToken` — NextAuth standard tables. `User.role` ∈ `{PUBLIC, VOLUNTEER, COORDINATOR, ADMIN}`. `User.status` ∈ `{ACTIVE, ARCHIVED}` (archived users blocked at sign-in).
- **Onboarding**: `VolunteerProfile` (status: APPLICATION_SUBMITTED → AWAITING_VETTING → APPROVED_FOR_INDUCTION → ACTIVE / INACTIVE; `mojStatus` ∈ NOT_STARTED/SUBMITTED/CLEARED/FLAGGED), `Application`, `Document`, `SignedAgreement`, `AgreementTemplate` (versioned, supports re-acknowledgement).
- **Operations**: `Leave` (a stretch of days someone is away, keyed by `User` - see Rostering below), `ServiceArea`, `Shift`, `ShiftSignup` (status: SIGNED_UP/ATTENDED/NO_SHOW/CANCELLED, with attendance audit fields), `ShiftOffer` (right of first refusal: PENDING/ACCEPTED/DECLINED, paired with `Shift.offersCloseOn`), `ShiftPattern` (a repeating shift with optional `endsOn` and named `regulars`; see below), `ClosedDay` (a day the kitchen is shut), `TrainingSession`, `TrainingAttendance`.
- **People**: `VolunteerGroup` (staff-named crews - Team Leaders, Guardian Angels - many-to-many with `VolunteerProfile`; `tone` picks the badge colour, `visibleToVolunteers` decides whether volunteers see it on /team and their profile). Purely descriptive: membership grants no access, that stays with `User.role`.
- **Communication**: `Announcement` (audience: ALL / VOLUNTEERS / COORDINATORS; optional `eventId` links a pānui to the gathering it announces — `onDelete: SetNull`, because a message that was sent stays sent).
- **Gatherings**: `Event` (a party, hui or working bee — status DRAFT/PUBLISHED/CANCELLED, `audience` decides who is invited *and* who may reply, `rsvpEnabled` + `rsvpDeadline` control replies) and `EventRsvp` (GOING / MAYBE / NOT_GOING + optional note, unique per user per event). Keyed by `User`, not `VolunteerProfile`: staff come to these too. Deliberately not a `Shift` (nobody is rostered) and not part of `Announcement` (an event outlives any one message about it and can be announced more than once). Publishing an event only makes it visible — telling people is what a pānui is for, which keeps push notifications in one place.

### Account deletion (App Store guideline 5.1.1(v))

Anyone may permanently erase their own account, in the app (`/profile/delete-account` → `GET`/`DELETE /api/v1/me/account`) or on the web (`/staff/account` → `deleteOwnAccount`). Both paths share one implementation:

- **What "erased" means** lives in `src/lib/data/account-erasure.ts` (`loadAccountErasureFacts` + `eraseUserAccount`) — used by the self-service path *and* by the admin's `staff-actions.deleteUser`, so the two can't drift. It also revokes the Apple authorisation, which the same guideline requires.
- **The rules** live in the pure `src/lib/user-deletion.ts`. Self-deletion is far more permissive than the admin path: the only blocker is being the last active admin, since erasing them leaves an organisation nobody can administer.
- **Records authored for the org survive** — `Shift`, `TrainingSession`, `Announcement` and `Event` all have a nullable `createdById` with `onDelete: SetNull`, so a shift that happened still happened and simply stops naming anybody. This is why *everyone* is deletable; it used to be a hard blocker for exactly the people who ran the kitchen.
- **A JWT outlives the account it names.** The layout gates therefore re-read the account on every authenticated page (`isSessionAccountActive`) and send a dead session to `/api/auth/session-ended`, which is a route handler because only a handler can clear the cookie — redirecting straight to `/login` loops, since the token still reads as signed in. The mobile API never had this problem: `authenticateApiRequest` already re-reads the user per request.

### Rostering: repeating shifts, closed days, offline volunteers

- **Hours only ever come from `ATTENDED` shift signups.** There is no separate hours ledger, so logging an offline volunteer's hours means putting them on the shift (`addVolunteerToShift`) - added to a past shift they go straight on as `ATTENDED`.
- **Every repeat is a `ShiftPattern`**, bounded or not. Shifts are generated `PATTERN_HORIZON_DAYS` (12 weeks) ahead by `src/lib/data/shift-patterns.ts`: on create/edit, and by `scheduleRosterTopUp()`, a throttled `after()` hook called from every roster read (staff shifts, calendar, volunteer shifts). There is no cron. Generation only moves `generatedThrough` forward, so a deleted generated shift or a closed day is never regenerated - the exception is cutting a pattern short, which rewinds it to the new last day so a later extension fills the gap. Removing a regular deletes their future pattern signups (not `CANCELLED`, which is reserved for a volunteer's own choice and never overridden), so re-adding them re-seats them; a one-off shift already at the same area/day/start time is adopted rather than doubled. Generated shifts are ordinary `Shift` rows (`patternId` set) and are edited individually.
- **`ClosedDay` is enforced everywhere a shift is placed**: `createShift`/`updateShift` refuse it, generation skips it, and closing a day deletes its shifts (refused once attendance is marked) and pushes the volunteers who use the app. Reopening restores pattern shifts for that day (`refillReopenedDay`), not one-offs.
- **Leave** (`Leave`: `startsOn`/`endsOn` inclusive `@db.Date`, optional `reason`, no approval step). It belongs to the person (`userId`), not their volunteer record, so the kitchen team keep it too: `keepsLeave` allows anyone with a `VolunteerProfile` plus every coordinator and admin. Only leave of someone with a volunteer record touches the roster; a coordinator who doesn't volunteer just has their dates on the board. Volunteers log their own (web `/profile/leave`, app `/leave`, `/api/v1/leave`); staff log it for anyone, themselves included, from `/staff/leave` or the person's record. All three paths go through `src/lib/data/leave.ts`. Leave is enforced wherever someone is seated: `decideSignup` and `decideStaffRoster` refuse a day on leave (staff can still record attendance on a past day), and `rosterRegulars` skips regulars on leave - read through `src/lib/data/leave-days.ts`, the counterpart to `closed-days.ts`. Saving leave works on the *difference* from what was there (`rosterChanges`), from today on: newly covered days take the volunteer off shifts - a regular's pattern seat is **deleted** (so it can be re-seated), a shift they chose is `CANCELLED`, and offers are declined - and days no longer covered put regulars back where there's room. One-off shifts are never restored. Past leave is the record and isn't edited; a volunteer cancels leave ahead and "comes back" from leave under way (`endLeaveDecision`), while staff can remove any of it. Staff changes to someone else's leave push them.
- **Offline volunteers** (`User.isOffline`): no password, email optional (`User.email` is nullable *only* for them). Sign-in paths assert an address via `toAuthenticatedUser`; staff UI falls back with `personName` / `contactLine` from `src/lib/format.ts`. They can't be impersonated or given a staff role. Redeeming a password reset clears `isOffline` and verifies the email - that's how one claims their record.

### Auth Roles
- `PUBLIC` — unauthenticated or pre-application
- `VOLUNTEER` — approved, can sign up for shifts
- `COORDINATOR` — manages applications, rostering, communication
- `ADMIN` — full system access + reporting

Route protection lives in **two places**:
1. `src/proxy.ts` — edge-level public-path allowlist; everything else needs a session.
2. The layout gates in `(volunteer)/layout.tsx` and `(staff)/staff/layout.tsx`, which decide who may use which area.

Always check role in Server Actions too — never trust the client. Use `requireActiveSession` / `requireStaffSession` (`src/lib/action-auth.ts`), never a bare `auth()`.

**The role in the JWT is a snapshot — never authorise with it.** `loadSessionAccess` (`src/lib/data/session-account.ts`) re-reads the account on every page and every action: whether it is still active, whether the token is on the account's current `User.sessionVersion`, and its **live role**. `requireActiveSession` overwrites `session.user.role` with that live role, and the layouts gate on it, so a demotion takes effect on the next request. The proxy deliberately doesn't gate `/staff` on the token's role: it would disagree with the layouts whenever a role changed mid-session and the two would redirect at each other.

**`User.sessionVersion` is the revocation switch.** Web sessions and mobile bearer tokens both carry the version they were minted on (`token.sessionVersion`, the `ver` claim) and stop working when it moves. A password reset, a password change and archiving bump it; `changeMyPassword` signs the current browser back in on the new version. Bump it anywhere else that should end every session.

### Design
- **Brand primary**: `#e4002b` (Pūaroha red) as `--primary` in light mode; a brighter `#ff3355` in dark mode.
- **Root font size**: 18px (`html { @apply font-sans text-[18px]; }`).
- **Fonts**: Hanken Grotesk (body/UI, shared with the mobile app) + Newsreader (display serif for titles, headings and figures) + Geist Mono, loaded with `next/font/google` in `src/app/layout.tsx`.
- **Theme tokens**: All colors via shadcn semantic CSS variables (`bg-primary`, `text-muted-foreground`, `bg-card`, `bg-sidebar`, etc.). Never hardcode hex values in components.
- **Charts**: Use `--chart-1` … `--chart-5` (red → ochre → taupe → green → stone).
- **Te Reo Māori** woven naturally — section labels, greetings, terms like *whānau*, *mahi*, *kai*, *aroha*, *nau mai haere mai*. Not tokenistic; warm and accurate.
- **Tone**: Warm and compassionate. Not clinical, not corporate. Address volunteers as people, not "users".
- **Layouts**: Volunteer = mobile-first (max-w-6xl, bottom footer nav on mobile). Staff = desktop-first sidebar (`lg:pl-64`, max-w-7xl).

### Component Conventions
- **Centralise repeated style patterns** into component variants (CVA) — don't duplicate Tailwind class strings across files.
- Keep `(volunteer)/` and `(staff)/` UI distinct — they have different information density and interaction patterns.
- Forms use server actions + `useFormState` / `useActionState` patterns; show errors inline.
- Toasts via `sonner` (`toast.success`, `toast.error`).
- Confirm destructive actions with `<AlertDialog>`.

### Testing

Two suites — keep both green on `main`.

**Unit / component (Vitest)** — `pnpm test` / `pnpm run test:ci`
- Config: `vitest.config.ts` (jsdom env, globals, `@/*` alias). Setup: `vitest.setup.ts` loads `@testing-library/jest-dom/vitest`.
- Location: co-locate as `*.test.ts` / `*.test.tsx` under `src/`.
- Components: use `@testing-library/react`. Assert on accessible roles/text, not implementation details.
- Server Actions: mock `@/lib/db` via `vi.mock("@/lib/db", () => ({ getDb: () => ({ ... }) }))`. Many actions also import `next-auth` (for `AuthError`) and `@/lib/auth` (for `signIn`) — both must be mocked when testing actions. See `src/lib/auth-actions.test.ts` for the pattern.
- When adding new pure utilities under `src/lib/`, add a sibling `*.test.ts`. For new Server Actions, extract branching/validation logic into pure helpers so it can be unit-tested without mocking.

**E2E (Playwright)** — `pnpm run e2e` / `pnpm run e2e:ci`
- Tests live in `e2e/*.spec.ts`. Config: `playwright.config.ts` runs Chromium against `next start -p 3100` and overrides `NEXTAUTH_URL` + `AUTH_TRUST_HOST` so NextAuth doesn't reject the test host.
- Requires the production build (`pnpm run build`) and Chromium (`pnpm exec playwright install chromium`) once.
- Public-only flows are covered today. DB-backed journeys (signup → application → admin approval → first shift) need a seeded test DB before they can land.

**CI** — `.github/workflows/ci.yml` has two jobs:
1. `ci` — lint → typecheck → test:ci → build (every push/PR)
2. `e2e` — depends on `ci`; installs Chromium (cached), builds, runs Playwright, uploads `playwright-report/` as an artifact

## Scripts
Run these **inside `apps/web`**. From the repo root, dep-heavy scripts (`build`, `typecheck`, `lint`, `test`, `test:ci`, `e2e`, `e2e:ci`) must go through Turbo (`pnpm run <script>` or `turbo run <script> --filter=web`), **not** the `pnpm web <script>` shortcut — e.g. `pnpm web e2e` is just `playwright test` with no build step, so it would run against a stale or absent `.next/` build. See the Turbo-bypass warning in Monorepo Layout.
```
pnpm run dev          # next dev
pnpm run build        # prisma generate && next build
pnpm run lint         # eslint
pnpm run typecheck    # tsc --noEmit
pnpm test             # vitest (watch mode)
pnpm run test:ci      # vitest run (single pass — used in CI)
pnpm run db:generate  # prisma generate
pnpm run db:migrate   # prisma migrate dev (create + apply migration locally)
pnpm run db:deploy    # prisma migrate deploy (apply pending migrations — used in prod / Docker)
pnpm run db:seed      # tsx prisma/seed.ts
pnpm run db:reset     # prisma migrate reset --force && seed
pnpm run db:studio    # prisma studio
```

**Package manager**: pnpm (locked via `packageManager` in `package.json`). Enable with `corepack enable` or install globally via `npm i -g pnpm`.

## Mobile App (`apps/mobile`)

Expo SDK 56 / React Native 0.85.3 app for volunteers, using `expo-router` (file-based routes under `src/app`: group `(auth)` (`login.tsx`, `register.tsx`); group `(tabs)` (`index.tsx`, `shifts.tsx`, `hours.tsx`, `training.tsx`, `profile.tsx`); top-level screens `news.tsx`, `onboarding.tsx`, `schedule.tsx`; dynamic dirs `shift/`, `training/`, `notice/` (each a `[id].tsx`); and static nested dirs `profile/` (`edit.tsx`) and `leave/` (`index.tsx`, `edit.tsx`)). Currently **mock-first**: services in `src/services/*` read from `src/data/mock-db.ts`; data fetching is via `@tanstack/react-query` (keys in `src/lib/query-keys.ts`). Styling uses `@expo/ui` + `expo-glass-effect` with theme tokens in `src/constants/theme.ts`.

- **Expo has changed** — `apps/mobile/AGENTS.md` (loaded via the `@AGENTS.md` include in `apps/mobile/CLAUDE.md`) mandates reading the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.
- Scripts (inside `apps/mobile`, or `pnpm mobile <script>`): `pnpm run dev` / `start` (expo start), `ios`, `android`, `web`, `lint` (expo lint), `typecheck`, `test` / `test:ci` (vitest).
- **Mobile unit tests cover `src/lib` only.** `vitest.config.ts` includes `src/lib/**/*.test.ts` and nothing else: component tests would need the React Native preset plus a native-module mock for every `@expo/ui` / `expo-glass-effect` import, which buys little for a UI that is verified on a simulator anyway. So put branching logic in a pure helper under `src/lib` with a sibling test, and keep components thin. The config defines `__DEV__` (modules read it at import time) and mocks are needed for any `expo-*` import the helper pulls in - see `src/lib/updates.test.ts`. Root `pnpm run test:ci` fans out to both apps via Turbo, so these run in CI.

### Releasing to iOS

Builds run on **EAS** (`eas.json` profiles + EAS project `@malinmw/compassion-volunteer`). `eas-cli` is a pinned devDependency, so the scripts use the workspace copy — no global install needed. None of these go through Turbo; run them with `pnpm mobile <script>`.

```
pnpm mobile build:ios:dev      # development build (dev client, internal distribution)
pnpm mobile build:ios:preview  # release build on a device, internal distribution
pnpm mobile build:ios          # production build for App Store Connect
pnpm mobile submit:ios         # upload the latest production build to App Store Connect
pnpm mobile release:ios        # build + auto-submit in one go
pnpm mobile version:ios        # current remote build number (appVersionSource: remote)
pnpm mobile credentials:ios    # manage signing certificates / provisioning profiles
pnpm mobile prebuild:ios       # regenerate ios/ locally — needed after a config-plugin change
```

- **A development build is not optional.** `@react-native-google-signin/google-signin` and the other native modules aren't in Expo Go, so anything touching Google sign-in must be tested on `build:ios:dev`.
- **Sign in with Apple needs a native rebuild, and the App ID capability.** `ios.usesAppleSignIn: true` plus the `expo-apple-authentication` plugin change the entitlements, so the runtime fingerprint moves and **no OTA update can deliver it** — it takes `build:ios`. EAS adds the "Sign In with Apple" capability to the App ID when it syncs credentials. Nothing goes in the app's EAS environment: the audience is the bundle id, so all the configuration is server-side (`APPLE_*`).
- **Env vars come from EAS, not `.env`.** `apps/mobile/.env` is gitignored, so it is never uploaded to a cloud build; each profile names an EAS environment (`development` / `preview` / `production`) and the variables are read from there. Manage them with `eas env:list --environment production` / `eas env:create`. Anything the app needs at build time — `EXPO_PUBLIC_API_URL`, the `EXPO_PUBLIC_GOOGLE_*_CLIENT_ID` pair — must exist in that environment or the build ships without it.
- **`submit.production` is empty on purpose.** The first `eas submit` prompts for the Apple ID, team and App Store Connect app id, and offers to save them.

### Over-the-air updates (EAS Update)

`expo-updates` ships JS/asset-only fixes straight to installed builds - no rebuild, no App Store review. Every build profile in `eas.json` names a `channel` matching its own name, and `app.json` carries `updates.url` plus `runtimeVersion: { policy: "fingerprint" }`.

```
pnpm mobile update:preview     # publish to the preview channel (internal / TestFlight builds)
pnpm mobile update:production  # publish to the production channel (App Store builds)
pnpm mobile update:list        # recent updates per branch
pnpm mobile update:rollback    # interactive: republish the previous update, or revert to embedded
pnpm mobile fingerprint        # the runtime fingerprint of the working tree
```

- **The channel is baked into the binary at build time.** A build made before this was wired up can never receive an update - it has no channel and no `updates.url`. Adding a channel, or renaming one, means a new build.
- **`--environment` is not optional on `eas update`.** Expo SDK 55+ requires it, and without it the OTA bundle is built with none of the EAS environment variables - it would ship with no `EXPO_PUBLIC_API_URL` and no Google client id. Both publish scripts pass the environment matching their channel; keep that pairing if you add another.
- **The fingerprint policy means JS-only.** `@expo/fingerprint` hashes the native side (autolinked modules, config plugins, app config), and an update only reaches builds whose fingerprint matches. Anything native - a new native dependency, a config-plugin change, an icon or entitlement change - shifts the fingerprint, so `eas update` simply will not reach the old build and you need `build:ios`. Run `pnpm mobile fingerprint` before publishing if unsure, or `eas fingerprint:compare` against the build.
- **Updates apply on a boundary, never mid-task.** `checkAutomatically: ON_LOAD` + `fallbackToCacheTimeout: 0` means launch never blocks on the network: the app starts on the cached bundle and downloads in the background. `src/components/app-updates.tsx` adds the resume half - it checks when the app returns to the foreground, and reloads into a downloaded update only when **both** hold: the app was backgrounded for `RESUME_RELOAD_AFTER_MS` (15 min) *and* the focused route is a read-only tab screen. Time alone is not enough - a phone call easily outlasts 15 minutes and can land mid-registration, and no form in the app persists a draft. `isReadOnlySurface` is an allowlist (`segments[0] === '(tabs)'`), so a new form route is excluded by default; the cost of being wrong that way is a delayed update rather than lost work. The manual check in `src/components/app-version.tsx` confirms via `Alert` instead, since it can't know what is open on another tab.
- **OTA cannot be tested in Expo Go or a dev build.** Both serve the bundle from Metro, and both report `Updates.isEnabled === true` with a non-embedded launch - so `IS_OTA_MANAGED` in `src/lib/updates.ts` (channel present, not `__DEV__`) is the flag to gate on, not `isEnabled`. Real testing needs `build:ios:preview` or a TestFlight build.
- **Publishing does not need the app to be on the App Store.** Preview and TestFlight builds take updates the same way, which makes this the fast path for fixing tester-reported bugs pre-launch.

## Environment
Required env vars for `apps/web` (see `apps/web/.env.example`):
- `DATABASE_URL` — PostgreSQL connection string (self-hosted, e.g. Coolify-managed). The Prisma client connects via this only (`prisma.config.ts` reads `DATABASE_URL`; the `schema.prisma` datasource has no `directUrl`).
- `NEXTAUTH_URL`, `NEXTAUTH_SECRET`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `APPLE_CLIENT_ID` - the bundle identifier tokens are audienced to, needed by `POST /api/v1/auth/apple`. Unset means Apple sign-in is off (503, and the app hides the button)
- `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` - the `.p8` server credentials. **Required for release, not for sign-in**: they exist to revoke the Apple authorisation when someone deletes their account, which App Store guideline 5.1.1(v) mandates. Without them a person who deletes their account can never sign up with Apple again - Apple returns the email on the first authorisation only, so the next attempt arrives with no address and is refused
- `GOOGLE_IOS_CLIENT_ID` - the iOS OAuth client, needed by `POST /api/v1/auth/google` for the mobile app's Google sign-in. **Not optional in any environment the iOS app talks to**: without `serverClientID` the iOS SDK audiences its ID token to the iOS client, so the endpoint refuses every Google sign-in from the app ("We couldn't verify that Google sign-in") even though Google's own sheet completes. Must match `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` in the app's EAS environment; the refusal reason and the token's actual audience are logged as `[google-id-token] refused a token: …`
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` — address autocomplete on the application form (optional; falls back to manual entry)
- `RESEND_API_KEY`, `EMAIL_FROM` — transactional email via Resend (optional; sending is skipped when unset)
- `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET` - Cloudflare R2 for document uploads. `S3_ENDPOINT` is the bucket-less account endpoint (`https://<ACCOUNT_ID>.r2.cloudflarestorage.com`) and `S3_REGION` is `auto`
- `DATABASE_POOL_MAX` — optional pg pool size (default 10)
