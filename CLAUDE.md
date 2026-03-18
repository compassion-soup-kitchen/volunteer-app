# Compassion Soup Kitchen — Volunteer App

## Project
Volunteer management app for Compassion Soup Kitchen (Te Pūaroha), Wellington, NZ.
~100 volunteers, mobile-first for volunteers, desktop for staff.

## Stack
- Next.js 16 App Router + TypeScript + Tailwind v4
- shadcn/ui (preset aw5FzQe, radix-lyra style, remixicon, mist base)
- Prisma ORM → Supabase PostgreSQL
- Supabase Storage for document uploads
- NextAuth.js (credentials + Google + Facebook)
- Resend for email
- motion/react for animations

## Conventions

### Rendering
- Pages are **Server Components** — never add `"use client"` at page level
- Wrap async data-fetching components in `<Suspense fallback={<Skeleton />}>`
- Push `"use client"` to leaf interactive components (forms, modals, toggles)
- Use **Server Actions** (`"use server"`) for all mutations — not API routes
- Use `'use cache'` for shared/expensive queries (service areas, public shift list)

### File Structure
- `(public)/` — unauthenticated routes (landing, login, register)
- `(volunteer)/` — authenticated volunteer routes
- `(staff)/` — coordinator and admin routes
- Route protection via `src/proxy.ts`

### Design
- Brand primary: `#DC0831` (oklch(0.52 0.22 18))
- Root font size: 18px
- Te Reo Māori woven naturally (section labels, greetings, terms like whānau, mahi, kai, aroha)
- Warm and compassionate tone — not clinical or corporate
- Components use shadcn semantic tokens (`bg-primary`, `text-muted-foreground`, etc.)
- **Always use the `ui-ux-pro-max:ui-ux-pro-max` skill** when building or modifying UI components and pages

### Database
- Prisma schema at `prisma/schema.prisma`
- Lazy-init DB client pattern (see Next.js skill guidance)
- All dates stored as UTC

### Auth Roles
- `PUBLIC` — unauthenticated or pre-application
- `VOLUNTEER` — approved, can sign up for shifts
- `COORDINATOR` — manages applications, rostering, communication
- `ADMIN` — full system access + reporting
