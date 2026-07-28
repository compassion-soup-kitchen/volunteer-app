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
- **Storage**: Garage (S3-compatible, self-hosted via Coolify) — accessed through the AWS S3 SDK in `src/lib/storage.ts`. Any S3-compatible backend works (Garage, R2, B2, …); only env values change.
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
│   ├── layout.tsx                    # Root: Mona Sans/Fraunces/Geist Mono fonts, ThemeProvider, SessionProvider, TooltipProvider, Toaster
│   ├── globals.css                   # Tailwind v4 + shadcn tokens (oklch), 18px root, brand red primary
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
│   │   ├── profile/                  # View profile + /edit subpage with profile-edit-form
│   │   ├── application/              # Application form (multi-step) — application-form.tsx
│   │   ├── shifts/                   # Browse & sign up — shift-browser.tsx
│   │   ├── training/                 # Browse & register — training-browser.tsx
│   │   ├── hours/                    # Personal hours log — hours-detail.tsx
│   │   ├── documents/                # View signed agreements + downloadable policies
│   │   ├── team/                     # Who's who — members of volunteer-visible groups
│   │   └── news/                     # Announcements feed
│   ├── (staff)/staff/                # COORDINATOR / ADMIN routes (desktop-first, sidebar layout)
│   │   ├── layout.tsx                # Auth gate, redirects volunteers → /dashboard
│   │   ├── staff-nav.tsx             # Sidebar nav
│   │   ├── dashboard/                # Staff overview
│   │   ├── applications/             # Review pending applications
│   │   ├── volunteers/               # Volunteer directory + per-volunteer detail
│   │   ├── groups/                   # CRUD volunteer groups + membership (group-manager.tsx)
│   │   ├── shifts/                   # Create/manage shifts, mark attendance, record meals
│   │   ├── service-areas/            # CRUD service areas
│   │   ├── training/                 # Create/manage training sessions
│   │   ├── documents/                # Upload templates, manage agreement templates
│   │   ├── announcements/            # Create/publish pānui (news for volunteers)
│   │   └── reports/                  # Charts & exports
│   └── api/
│       └── auth/                     # NextAuth handlers (only API route — everything else uses Server Actions)
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
│   ├── storage.ts                    # S3-compatible storage client (Garage) — uploads/presigned URLs
│   ├── utils.ts                      # `cn()` helper (clsx + tailwind-merge)
│   ├── milestones.ts                 # Volunteer milestone definitions
│   ├── push.ts                       # Expo push notifications — batch send via exp.host, dead-token pruning
│   ├── email-templates.ts            # All transactional email copy as pure template functions (previewed at /styleguide/emails)
│   ├── email-verification.ts         # Verification-token issue/redeem + email (shared by web actions and /api/v1 register)
│   ├── auth-actions.ts               # Server Actions: login, register, email verification, password reset
│   ├── application-actions.ts        # Submit/review applications
│   ├── dashboard-actions.ts          # Volunteer dashboard data fetchers
│   ├── shift-actions.ts              # CRUD shifts, signups, attendance, meals
│   ├── training-actions.ts           # CRUD training sessions + attendance
│   ├── service-area-actions.ts       # CRUD service areas
│   ├── group-actions.ts              # CRUD volunteer groups, membership, volunteer-facing team reads
│   ├── volunteer-groups.ts           # Pure group helpers (tones → badge variants, validation, diffing)
│   ├── document-actions.ts           # Uploads, agreement templates, signed agreements
│   ├── announcement-actions.ts       # CRUD announcements
│   ├── staff-actions.ts              # Volunteer directory, archiving, role changes
│   └── report-actions.ts             # Aggregations / chart data
│
├── types/
│   └── next-auth.d.ts                # Augments Session.user with `role: Role`
│
└── proxy.ts                          # Edge proxy: public path allowlist, auth gate,
                                       #   role-based redirect for /staff/*

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
- **Operations**: `ServiceArea`, `Shift`, `ShiftSignup` (status: SIGNED_UP/ATTENDED/NO_SHOW/CANCELLED, with attendance audit fields), `ShiftOffer` (right of first refusal: PENDING/ACCEPTED/DECLINED, paired with `Shift.offersCloseOn`), `TrainingSession`, `TrainingAttendance`.
- **People**: `VolunteerGroup` (staff-named crews - Team Leaders, Guardian Angels - many-to-many with `VolunteerProfile`; `tone` picks the badge colour, `visibleToVolunteers` decides whether volunteers see it on /team and their profile). Purely descriptive: membership grants no access, that stays with `User.role`.
- **Communication**: `Announcement` (audience: ALL / VOLUNTEERS / COORDINATORS).

### Auth Roles
- `PUBLIC` — unauthenticated or pre-application
- `VOLUNTEER` — approved, can sign up for shifts
- `COORDINATOR` — manages applications, rostering, communication
- `ADMIN` — full system access + reporting

Route protection lives in **two places**:
1. `src/proxy.ts` — edge-level allowlist + role check for `/staff/*`.
2. Per-layout `auth()` checks in `(volunteer)/layout.tsx` and `(staff)/staff/layout.tsx`.

Always check role in Server Actions too — never trust the client.

### Design
- **Brand primary**: `#DC0831` → `oklch(0.52 0.22 18)` (red). Used as `--primary` in light mode; slightly muted in dark mode.
- **Root font size**: 18px (`html { @apply font-sans text-[18px]; }`).
- **Fonts**: Mona Sans (self-hosted, body/UI) + Fraunces (display serif) + Geist Mono, wired in `src/app/layout.tsx`.
- **Theme tokens**: All colors via shadcn semantic CSS variables (`bg-primary`, `text-muted-foreground`, `bg-card`, `bg-sidebar`, etc.). Never hardcode hex values in components.
- **Charts**: Use `--chart-1` … `--chart-5` (red ramp).
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

Expo SDK 56 / React Native 0.85.3 app for volunteers, using `expo-router` (file-based routes under `src/app`: group `(auth)` (`login.tsx`, `register.tsx`); group `(tabs)` (`index.tsx`, `shifts.tsx`, `hours.tsx`, `training.tsx`, `profile.tsx`); top-level screens `news.tsx`, `onboarding.tsx`, `schedule.tsx`; dynamic dirs `shift/`, `training/`, `notice/` (each a `[id].tsx`); and static nested dir `profile/` (`edit.tsx`)). Currently **mock-first**: services in `src/services/*` read from `src/data/mock-db.ts`; data fetching is via `@tanstack/react-query` (keys in `src/lib/query-keys.ts`). Styling uses `@expo/ui` + `expo-glass-effect` with theme tokens in `src/constants/theme.ts`.

- **Expo has changed** — `apps/mobile/AGENTS.md` (loaded via the `@AGENTS.md` include in `apps/mobile/CLAUDE.md`) mandates reading the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.
- Scripts (inside `apps/mobile`, or `pnpm mobile <script>`): `pnpm run dev` / `start` (expo start), `ios`, `android`, `web`, `lint` (expo lint), `typecheck`.

## Environment
Required env vars for `apps/web` (see `apps/web/.env.example`):
- `DATABASE_URL` — PostgreSQL connection string (self-hosted, e.g. Coolify-managed). The Prisma client connects via this only (`prisma.config.ts` reads `DATABASE_URL`; the `schema.prisma` datasource has no `directUrl`).
- `NEXTAUTH_URL`, `NEXTAUTH_SECRET`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` — address autocomplete on the application form (optional; falls back to manual entry)
- `RESEND_API_KEY`, `EMAIL_FROM` — transactional email via Resend (optional; sending is skipped when unset)
- `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET` — S3-compatible storage (Garage) for document uploads
- `DATABASE_POOL_MAX` — optional pg pool size (default 10)
