# 🍲 Te Pūaroha — Volunteer App

> Volunteer management for **Compassion Soup Kitchen**, Wellington, Aotearoa New Zealand 🇳🇿

Nau mai, haere mai. This app supports the ~100 volunteers who serve kai, build community, and restore mana through Compassion Soup Kitchen (Te Pūaroha). It handles the full volunteer journey — from first application through to active rostering, training, and attendance — with a mobile-first experience for volunteers and a desktop control panel for coordinators.

---

## ✨ Features

### 👥 For Volunteers (mobile-first)
- 📝 Apply online — multi-step application with availability, interests, signed agreements
- 📅 Browse & sign up for shifts across service areas
- 🎓 Register for induction & training sessions
- ⏱️ Track personal hours and milestones
- 📄 View signed agreements and download policy documents
- 📣 Read announcements from the team
- 🙋 Manage profile, emergency contacts, and skills

### 🛠️ For Staff (Coordinators & Admins)
- 📥 Review and approve volunteer applications
- 🪪 Track Ministry of Justice (MoJ) vetting status
- 📋 Volunteer directory with search, filter, archive
- 🗓️ Create & manage shifts, mark attendance, record meals served
- 🎯 Manage service areas and training sessions
- 📂 Upload documents and version agreement templates (with re-acknowledgement)
- 📢 Publish announcements to specific audiences
- 📊 Reports and charts for impact tracking

---

## 🧱 Stack

| Layer | Tech |
|---|---|
| 🖼️ Framework | Next.js 16 (App Router) + React 19 + TypeScript |
| 🎨 Styling | Tailwind v4 + shadcn/ui (`radix-lyra` style, `mist` base, `remixicon`) |
| 🗄️ Database | Prisma 7 → self-hosted PostgreSQL (Coolify-managed) |
| 📦 Storage | Cloudflare R2 (S3-compatible API) for document uploads |
| 🔐 Auth | NextAuth v5 — Credentials + Google, JWT sessions |
| ✉️ Email | Resend HTTP API via `src/lib/email.ts` (no-ops when `RESEND_API_KEY` unset) |
| ✨ Animation | `motion/react` |
| 🎯 Validation | `zod` |
| 🔔 Toasts | `sonner` |
| 📊 Charts | `recharts` |

---

## 🚀 Getting Started

### Prerequisites
- Node.js ≥ 20
- pnpm (enabled via `corepack enable`, or `npm i -g pnpm`)
- A PostgreSQL database and a Cloudflare R2 bucket - see `.env.example`
- Google OAuth credentials (optional but recommended)

### 1️⃣ Install dependencies
```bash
pnpm install
```

### 2️⃣ Configure environment
Copy `.env.example` → `.env.local` and fill in:
```bash
DATABASE_URL="postgresql://..."                  # self-hosted PostgreSQL
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET=""                               # npx auth secret
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
```

### 3️⃣ Set up the database
```bash
pnpm run db:migrate  # create + apply migration
pnpm run db:seed     # seed dev data
```

### 4️⃣ Run the dev server
```bash
pnpm run dev
```
Visit 👉 [http://localhost:3000](http://localhost:3000)

---

## 🧪 Testing

Two layers — both run in CI on every push and PR to `main` (`.github/workflows/ci.yml`).

### Unit & component tests — [Vitest](https://vitest.dev)

```bash
pnpm test          # 👀 watch mode
pnpm run test:ci   # 🚦 single run (used in CI)
```

- jsdom environment with React Testing Library + `@testing-library/jest-dom` matchers
- Test files live next to the code they cover: `*.test.ts` / `*.test.tsx` under `src/`
- Config: `vitest.config.ts` · setup: `vitest.setup.ts`
- Server actions are tested with mocked Prisma (`vi.mock("@/lib/db", ...)`); we don't stand up a real DB for unit tests

### End-to-end tests — [Playwright](https://playwright.dev)

```bash
# first-time browser install
pnpm exec playwright install chromium

# build is required because Playwright runs `next start`
pnpm run build && pnpm run e2e
```

- Tests live in `e2e/*.spec.ts`
- Config: `playwright.config.ts` — runs Chromium against `next start` on port `3100`
- Currently covers the public landing → register/login flow; DB-backed journeys to follow once we have a seeded test database

---

## 📜 Scripts

| Command | What it does |
|---|---|
| `pnpm run dev` | 🏃 Start the Next.js dev server |
| `pnpm run build` | 🏗️ Generate Prisma client + production build |
| `pnpm run start` | ▶️ Run the production build |
| `pnpm run lint` | 🧹 Run ESLint |
| `pnpm run typecheck` | 🧠 `tsc --noEmit` |
| `pnpm test` | 🧪 Vitest in watch mode |
| `pnpm run test:ci` | 🚦 Vitest single run (CI) |
| `pnpm run e2e` | 🎭 Playwright E2E tests |
| `pnpm run e2e:ci` | 🎭 Playwright E2E (CI) |
| `pnpm run db:generate` | ⚙️ Regenerate Prisma client |
| `pnpm run db:migrate` | ⬆️ Create + apply a migration (local dev) |
| `pnpm run db:deploy` | 🚀 Apply pending migrations (prod / Docker) |
| `pnpm run db:seed` | 🌱 Seed dev data |
| `pnpm run db:reset` | 💥 Force-reset DB and re-seed |
| `pnpm run db:studio` | 🔍 Open Prisma Studio |

---

## 🗂️ Project Structure

```
src/
├── app/
│   ├── (public)/       # 🌐 Landing, login, register
│   ├── (volunteer)/    # 📱 Volunteer routes (mobile-first)
│   ├── (staff)/staff/  # 🖥️ Coordinator & admin routes (sidebar)
│   ├── api/auth/       # 🔐 NextAuth handlers (only API route)
│   ├── layout.tsx      # 🎨 Theme + Session + Toaster providers
│   └── globals.css     # 🎨 Tailwind v4 + shadcn tokens
├── components/
│   ├── ui/             # 🧩 shadcn primitives
│   └── ...             # 📅 date-picker, signature-pad, etc.
├── lib/
│   ├── auth.ts         # 🔑 NextAuth config
│   ├── db.ts           # 🗄️ Lazy-init Prisma client
│   ├── *-actions.ts    # ⚡ Server Actions (all mutations)
│   └── ...
└── proxy.ts            # 🛡️ Edge-level auth + role gate
prisma/
└── schema.prisma       # 📐 Single source of truth
```

---

## 🔐 Roles

| Role | What they can do |
|---|---|
| 🌍 `PUBLIC` | Browse landing, register, log in |
| 🙋 `VOLUNTEER` | Sign up for shifts, training, view docs, manage profile |
| 🧑‍💼 `COORDINATOR` | Manage applications, rostering, communication |
| 👑 `ADMIN` | Full system access + reporting |

Route protection lives in two layers:
1. 🛡️ `src/proxy.ts` — edge-level allowlist + role gate for `/staff/*`
2. 🚧 Per-layout `auth()` checks in `(volunteer)/` and `(staff)/`

Server Actions also re-check role — never trust the client. 🔒

---

## 🧭 Conventions

- 🖥️ **Server Components by default** — push `"use client"` to leaf interactive components only
- ⚡ **Server Actions for all mutations** — no API routes (except `/api/auth`)
- 💤 Wrap async data fetchers in `<Suspense fallback={<Skeleton />}>`
- 🗃️ Use `getDb()` from `@/lib/db` — never instantiate `PrismaClient` elsewhere
- ✅ Validate Server Action inputs with `zod`
- 🔁 Always `revalidatePath` / `revalidateTag` after mutations
- 🎨 Use shadcn semantic tokens (`bg-primary`, `text-muted-foreground`) — no hardcoded hex
- 🌿 Te Reo Māori woven naturally — *whānau, mahi, kai, aroha, nau mai haere mai*
- 💝 Warm, compassionate tone — not clinical, not corporate

See [`CLAUDE.md`](./CLAUDE.md) for the full developer guide. 📖

---

## 🎨 Design

- **Brand primary**: 🔴 `#DC0831` → `oklch(0.52 0.22 18)`
- **Fonts**: Mona Sans (body) + Fraunces (display) + Geist Mono, 18px base
- **Layouts**: Volunteer = mobile-first with bottom nav; Staff = desktop sidebar
- **Charts**: Red ramp (`--chart-1` … `--chart-5`)
- 🌓 Dark mode supported via `next-themes`

---

## 🚀 Going to production

The app ships as a single Docker container (repo-root `Dockerfile`, built for
Coolify). `prisma migrate deploy` runs automatically on container start, and
`/api/health/ready` backs the container healthcheck.

**Required environment variables** (see `.env.example`):
`DATABASE_URL`, `NEXTAUTH_URL` (the real https:// domain), `NEXTAUTH_SECRET`
(generate a fresh one — never reuse dev's), `GOOGLE_CLIENT_ID` +
`GOOGLE_CLIENT_SECRET` (with the prod domain added to the OAuth redirect
allowlist), `GOOGLE_IOS_CLIENT_ID`, and `S3_*` for R2 document storage (see
below).

`GOOGLE_IOS_CLIENT_ID` is easy to miss and fails in a way that points nowhere:
the iOS app's Google sign-in produces an ID token audienced to the **iOS**
OAuth client, so without it `POST /api/v1/auth/google` refuses every Google
sign-in from the app with "We couldn't verify that Google sign-in" while
Google's own sheet works perfectly. It must be the iOS client from the same
Google Cloud project as `GOOGLE_CLIENT_ID`, and match
`EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` in the app's EAS environment. The refusal
reason (including the audience the token actually carried) is logged as
`[google-id-token] refused a token: …`.

**Optional but recommended**: `RESEND_API_KEY` + `EMAIL_FROM` (password reset
and application emails are skipped without them), and
`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (address autocomplete; falls back to manual
entry — restrict the key to the prod domain).

**Storage (Cloudflare R2)** - uploaded policies, agreement templates and pānui
attachments live in an R2 bucket, reached over its S3-compatible API. Set it up
once in the Cloudflare dashboard:

1. **R2 → Create bucket**, e.g. `volunteer-app-documents`. Pick a location hint
   near the kitchen (APAC). Leave public access **off** - the app hands out
   short-lived signed URLs, and nothing here should be world-readable.
2. On the bucket, **Settings → S3 API** gives the endpoint. Copy only the
   account part into `S3_ENDPOINT` - `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`,
   with no bucket on the end. The bucket goes in `S3_BUCKET`.
3. **R2 → API → Manage API tokens → Create**. Permission **Object Read & Write**,
   scoped to just this bucket. The Access Key ID → `S3_ACCESS_KEY`, the Secret
   Access Key → `S3_SECRET_KEY`. The secret shows once.
4. `S3_REGION="auto"` (R2 has no regions; the SDK insists on a value).

Then prove it works rather than waiting for a coordinator to find out:

```
cd /app/apps/web && ./node_modules/.bin/tsx scripts/check-storage.ts
```

(Locally: `pnpm run storage:check`.) It uploads a small object, downloads it
back through a signed URL, compares the bytes and deletes it - so a wrong
bucket, a read-only token or a bucket-suffixed endpoint fails loudly here.

**First admin** — the seed is dev-only (it refuses to run in production, since
it creates demo accounts with known passwords). Bootstrap the first admin from
inside the running container:

```
cd /app/apps/web && ./node_modules/.bin/tsx scripts/create-admin.ts \
  --email you@example.org.nz --name "Your Name"
```

(Locally: `pnpm run admin:create -- --email … --name …`. Add `--promote` to
raise an existing account to ADMIN instead. The generated password prints once
— change it after first sign-in.)

**Before flicking the switch**: set up automated Postgres backups in Coolify,
turn on object versioning or a lifecycle rule on the R2 bucket, and confirm the
privacy page's contact details are correct for the kitchen.

---

## 🤝 Contributing

This app is built for and with the team at Compassion Soup Kitchen. Issues and suggestions welcome — open a PR or kōrero with the team. 💬

---

## 💛 Kupu whakamutunga (closing words)

> *Mā te whiritahi, ka whakatutuki ai ngā pūmanawa ā tāngata.*
> Through working together, individual potential will be realised.

Made with aroha for Te Pūaroha. 🍲❤️
