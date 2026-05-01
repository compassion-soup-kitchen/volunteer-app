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
| 🗄️ Database | Prisma 7 → Supabase PostgreSQL |
| 📦 Storage | Supabase Storage (document uploads) |
| 🔐 Auth | NextAuth v5 — Credentials + Google, JWT sessions |
| ✉️ Email | Resend (planned) |
| ✨ Animation | `motion/react` |
| 🎯 Validation | `zod` |
| 🔔 Toasts | `sonner` |
| 📊 Charts | `recharts` |

---

## 🚀 Getting Started

### Prerequisites
- Node.js ≥ 20
- A Supabase project (PostgreSQL + Storage)
- Google OAuth credentials (optional but recommended)

### 1️⃣ Install dependencies
```bash
npm install
```

### 2️⃣ Configure environment
Copy `.env.example` → `.env.local` and fill in:
```bash
DATABASE_URL="postgresql://...?pgbouncer=true"   # Supabase pooled
DIRECT_DATABASE_URL="postgresql://..."           # Supabase direct (migrations)
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET=""                               # npx auth secret
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
```

### 3️⃣ Set up the database
```bash
npm run db:push     # apply schema
npm run db:seed     # seed dev data
```

### 4️⃣ Run the dev server
```bash
npm run dev
```
Visit 👉 [http://localhost:3000](http://localhost:3000)

---

## 🧪 Testing

Two layers — both run in CI on every push and PR to `main` (`.github/workflows/ci.yml`).

### Unit & component tests — [Vitest](https://vitest.dev)

```bash
npm test          # 👀 watch mode
npm run test:ci   # 🚦 single run (used in CI)
```

- jsdom environment with React Testing Library + `@testing-library/jest-dom` matchers
- Test files live next to the code they cover: `*.test.ts` / `*.test.tsx` under `src/`
- Config: `vitest.config.ts` · setup: `vitest.setup.ts`
- Server actions are tested with mocked Prisma (`vi.mock("@/lib/db", ...)`); we don't stand up a real DB for unit tests

### End-to-end tests — [Playwright](https://playwright.dev)

```bash
# first-time browser install
npx playwright install chromium

# build is required because Playwright runs `next start`
npm run build && npm run e2e
```

- Tests live in `e2e/*.spec.ts`
- Config: `playwright.config.ts` — runs Chromium against `next start` on port `3100`
- Currently covers the public landing → register/login flow; DB-backed journeys to follow once we have a seeded test database

---

## 📜 Scripts

| Command | What it does |
|---|---|
| `npm run dev` | 🏃 Start the Next.js dev server |
| `npm run build` | 🏗️ Generate Prisma client + production build |
| `npm run start` | ▶️ Run the production build |
| `npm run lint` | 🧹 Run ESLint |
| `npm run typecheck` | 🧠 `tsc --noEmit` |
| `npm test` | 🧪 Vitest in watch mode |
| `npm run test:ci` | 🚦 Vitest single run (CI) |
| `npm run e2e` | 🎭 Playwright E2E tests |
| `npm run e2e:ci` | 🎭 Playwright E2E (CI) |
| `npm run db:generate` | ⚙️ Regenerate Prisma client |
| `npm run db:push` | ⬆️ Push schema to the database |
| `npm run db:seed` | 🌱 Seed dev data |
| `npm run db:reset` | 💥 Force-reset DB and re-seed (uses `DIRECT_DATABASE_URL`) |
| `npm run db:studio` | 🔍 Open Prisma Studio |

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
- **Root font**: Geist (18px base)
- **Layouts**: Volunteer = mobile-first with bottom nav; Staff = desktop sidebar
- **Charts**: Red ramp (`--chart-1` … `--chart-5`)
- 🌓 Dark mode supported via `next-themes`

---

## 🤝 Contributing

This app is built for and with the team at Compassion Soup Kitchen. Issues and suggestions welcome — open a PR or kōrero with the team. 💬

---

## 💛 Kupu whakamutunga (closing words)

> *Mā te whiritahi, ka whakatutuki ai ngā pūmanawa ā tāngata.*
> Through working together, individual potential will be realised.

Made with aroha for Te Pūaroha. 🍲❤️
