# Compassion Soup Kitchen — Te Pūaroha

Monorepo for the Compassion Soup Kitchen volunteer platform (Wellington, NZ).

## Workspaces

| Path          | Package  | Description                                              |
| ------------- | -------- | -------------------------------------------------------- |
| `apps/web`    | `web`    | Next.js 16 volunteer + staff web app (see its README).   |
| `apps/mobile` | `mobile` | Expo / React Native app (coming soon).                   |
| `packages/*`  | —        | Shared workspace packages (types, validation, …).        |

## Tooling

- **Package manager**: pnpm workspaces (`pnpm-workspace.yaml`)
- **Task runner**: [Turborepo](https://turborepo.com) (`turbo.json`)

Enable pnpm with `corepack enable` (or `npm i -g pnpm`).

## Common commands

Run from the repo root — Turbo fans tasks out across every workspace that
defines them:

```
pnpm install            # install all workspaces
pnpm dev                # run every app's dev server
pnpm build              # build all apps
pnpm lint               # lint all apps
pnpm typecheck          # typecheck all apps
pnpm test:ci            # run unit/component tests
```

Target a single app with the `--filter` shortcuts:

```
pnpm web dev            # = pnpm --filter web dev
pnpm web db:migrate     # any script from apps/web/package.json
pnpm mobile start       # = pnpm --filter mobile start (once added)
```

See [`apps/web/README.md`](apps/web/README.md) for web-specific setup
(database, storage, auth, environment variables).
