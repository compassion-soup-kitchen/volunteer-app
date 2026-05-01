# Compassion Soup Kitchen — Volunteer App

## Project
Volunteer management app for Compassion Soup Kitchen (Te Pūaroha), Wellington, NZ.
~100 volunteers. Mobile-first for volunteers, desktop for staff (coordinators/admins).

The app handles the full volunteer lifecycle: public signup → application review → MoJ vetting → induction → active rostering → attendance, training, hours tracking, document management, and announcements.

## Stack
- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript
- **Styling**: Tailwind v4 + shadcn/ui (preset `aw5FzQe`, style `radix-lyra`, base `mist`, icon library `remixicon`)
- **DB**: Prisma 7 ORM → Supabase PostgreSQL (via `@prisma/adapter-pg` + `pg` Pool)
- **Storage**: Supabase Storage (document uploads)
- **Auth**: NextAuth v5 (beta) — Credentials + Google providers, JWT sessions, PrismaAdapter
- **Email**: Resend (planned)
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
src/
├── app/
│   ├── layout.tsx                    # Root: Geist fonts, ThemeProvider, SessionProvider, TooltipProvider, Toaster
│   ├── globals.css                   # Tailwind v4 + shadcn tokens (oklch), 18px root, brand red primary
│   ├── (public)/                     # Unauthenticated routes
│   │   ├── page.tsx                  # Landing page
│   │   ├── landing-nav.tsx
│   │   ├── login/
│   │   └── register/
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
│   │   └── news/                     # Announcements feed
│   ├── (staff)/staff/                # COORDINATOR / ADMIN routes (desktop-first, sidebar layout)
│   │   ├── layout.tsx                # Auth gate, redirects volunteers → /dashboard
│   │   ├── staff-nav.tsx             # Sidebar nav
│   │   ├── dashboard/                # Staff overview
│   │   ├── applications/             # Review pending applications
│   │   ├── volunteers/               # Volunteer directory + per-volunteer detail
│   │   ├── shifts/                   # Create/manage shifts, mark attendance, record meals
│   │   ├── service-areas/            # CRUD service areas
│   │   ├── training/                 # Create/manage training sessions
│   │   ├── documents/                # Upload templates, manage agreement templates
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
│   ├── db.ts                         # Lazy-init Prisma client (PrismaPg adapter, Pool max=1)
│   ├── supabase.ts                   # Supabase client (Storage)
│   ├── utils.ts                      # `cn()` helper (clsx + tailwind-merge)
│   ├── milestones.ts                 # Volunteer milestone definitions
│   ├── auth-actions.ts               # Server Actions: login, register, logout
│   ├── application-actions.ts        # Submit/review applications
│   ├── dashboard-actions.ts          # Volunteer dashboard data fetchers
│   ├── shift-actions.ts              # CRUD shifts, signups, attendance, meals
│   ├── training-actions.ts           # CRUD training sessions + attendance
│   ├── service-area-actions.ts       # CRUD service areas
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
- Prisma schema at `prisma/schema.prisma` — single source of truth. Run `npm run db:generate` after edits.
- Lazy-init pattern: import `getDb()` from `@/lib/db` (never instantiate PrismaClient elsewhere).
- All dates stored as UTC; shift `date` is `@db.Date`, times stored as `String` (HH:mm).
- Cascade deletes on user-owned data (Account, Session, VolunteerProfile, ShiftSignup, TrainingAttendance, etc.).

### Database Models (overview)
- **Auth**: `User`, `Account`, `Session`, `VerificationToken` — NextAuth standard tables. `User.role` ∈ `{PUBLIC, VOLUNTEER, COORDINATOR, ADMIN}`. `User.status` ∈ `{ACTIVE, ARCHIVED}` (archived users blocked at sign-in).
- **Onboarding**: `VolunteerProfile` (status: APPLICATION_SUBMITTED → AWAITING_VETTING → APPROVED_FOR_INDUCTION → ACTIVE / INACTIVE; `mojStatus` ∈ NOT_STARTED/SUBMITTED/CLEARED/FLAGGED), `Application`, `Document`, `SignedAgreement`, `AgreementTemplate` (versioned, supports re-acknowledgement).
- **Operations**: `ServiceArea`, `Shift`, `ShiftSignup` (status: SIGNED_UP/ATTENDED/NO_SHOW/CANCELLED, with attendance audit fields), `TrainingSession`, `TrainingAttendance`.
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
- **Font**: Geist + Geist Mono via `next/font/google`.
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

**Unit / component (Vitest)** — `npm test` / `npm run test:ci`
- Config: `vitest.config.ts` (jsdom env, globals, `@/*` alias). Setup: `vitest.setup.ts` loads `@testing-library/jest-dom/vitest`.
- Location: co-locate as `*.test.ts` / `*.test.tsx` under `src/`.
- Components: use `@testing-library/react`. Assert on accessible roles/text, not implementation details.
- Server Actions: mock `@/lib/db` via `vi.mock("@/lib/db", () => ({ getDb: () => ({ ... }) }))`. Many actions also import `next-auth` (for `AuthError`) and `@/lib/auth` (for `signIn`) — both must be mocked when testing actions. See `src/lib/auth-actions.test.ts` for the pattern.
- When adding new pure utilities under `src/lib/`, add a sibling `*.test.ts`. For new Server Actions, extract branching/validation logic into pure helpers so it can be unit-tested without mocking.

**E2E (Playwright)** — `npm run e2e` / `npm run e2e:ci`
- Tests live in `e2e/*.spec.ts`. Config: `playwright.config.ts` runs Chromium against `next start -p 3100` and overrides `NEXTAUTH_URL` + `AUTH_TRUST_HOST` so NextAuth doesn't reject the test host.
- Requires the production build (`npm run build`) and Chromium (`npx playwright install chromium`) once.
- Public-only flows are covered today. DB-backed journeys (signup → application → admin approval → first shift) need a seeded test DB before they can land.

**CI** — `.github/workflows/ci.yml` has two jobs:
1. `ci` — lint → typecheck → test:ci → build (every push/PR)
2. `e2e` — depends on `ci`; installs Chromium (cached), builds, runs Playwright, uploads `playwright-report/` as an artifact

## Scripts
```
npm run dev          # next dev
npm run build        # prisma generate && next build
npm run lint         # eslint
npm run typecheck    # tsc --noEmit
npm test             # vitest (watch mode)
npm run test:ci      # vitest run (single pass — used in CI)
npm run db:generate  # prisma generate
npm run db:push      # prisma db push
npm run db:seed      # tsx prisma/seed.ts
npm run db:reset     # force-reset + seed (uses DIRECT_DATABASE_URL)
npm run db:studio    # prisma studio
```

## Environment
Required env vars (see `.env.example`):
- `DATABASE_URL` — Supabase pooled (pgbouncer)
- `DIRECT_DATABASE_URL` — Supabase direct (for migrations / db:reset)
- `NEXTAUTH_URL`, `NEXTAUTH_SECRET`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `FACEBOOK_CLIENT_ID`, `FACEBOOK_CLIENT_SECRET` (provider stubbed; not yet wired)
- Supabase Storage keys (for document uploads)
