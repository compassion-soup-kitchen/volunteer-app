# Compassion Volunteers — mobile app

The volunteer-facing mobile companion to the Compassion / Te Pūaroha web app. Built with
**Expo (SDK 56) + Expo Router + React Native + TypeScript**. Mobile-first, warm, with Te Reo
Māori woven through, mirroring the brand of the [web app](../web).

## Status

First build — the **core rostering experience**: sign in, dashboard, browse & sign up for
shifts, training, hours & impact, and profile.

> **Data is mocked.** Every screen runs against an in-memory fixture store
> (`src/data/mock-db.ts`) behind a typed service layer (`src/services/*`). The web app has no
> JSON API yet, so this lets the whole UX run on a device today. Each service is a one-file swap
> to a real endpoint later (gated on `EXPO_PUBLIC_API_URL`). Sign in with **any** email + password.

## Run

From the repo root (preferred — keeps the pnpm workspace consistent):

```bash
pnpm install
pnpm mobile start        # or: pnpm --filter mobile start
```

Then press `i` (iOS simulator), `a` (Android), or scan the QR code with **Expo Go**. No custom
native code is used, so Expo Go works out of the box.

```bash
pnpm --filter mobile typecheck   # tsc --noEmit
pnpm --filter mobile lint        # expo lint
```

## Architecture

```
src/
├── app/                      # Expo Router routes (file-based)
│   ├── _layout.tsx           # Providers (Query, Auth, Toast, theme), fonts + splash gate
│   ├── (auth)/               # login, register (redirects to app when signed in)
│   ├── (tabs)/               # 5 bottom tabs: index (dashboard), shifts, training, hours, profile
│   ├── shift/[id].tsx        # Shift detail + sign-up / cancel
│   └── profile/edit.tsx      # Edit profile (modal)
├── components/
│   ├── ui/                   # Design-system primitives (Text, Button, Card, Badge, Screen, …)
│   └── *.tsx                 # Feature components (shift-card, next-shift-card, training-card, …)
├── constants/theme.ts        # Brand tokens: colours (light/dark), type, spacing, radius, shadows
├── data/mock-db.ts           # Seeded, mutable in-memory store (the swappable seam)
├── services/                 # Typed service layer mirroring the web Server Actions
├── providers/                # auth-provider, toast-provider
├── lib/                      # milestones, format, query-keys, query-client
└── types/models.ts           # Domain types mirroring the Prisma shapes
```

### Conventions

- **Theme tokens only** — never hardcode hex or font sizes in screens. Use `<Text variant>` and
  `colors.*` from `useTheme()`. Centralise repeated styles into variant components.
- **Styling**: StyleSheet + the `constants/theme.ts` token system (no NativeWind). Fraunces
  (serif) for display/titles, system sans for UI, tabular mono for data.
- **Data**: React Query for fetching/caching; invalidate keys after a mutation (the mobile
  equivalent of the web app's `revalidatePath`).
- **Safe areas, 44pt touch targets, press feedback, haptics, light/dark** are baked into the
  primitives.

## Not yet built (deferred from v1)

News feed, documents & agreement signing (signature pad), and the multi-step application
onboarding — plus the real API + a mobile auth-token flow to replace the mock.
