# Monorepo Dockerfile — build context is the repo root.
# Builds the `web` workspace (apps/web) into a Next.js standalone bundle.
FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.1.3 --activate

# Copy workspace manifests first for better layer caching. Every workspace's
# package.json must be present for pnpm to resolve the lockfile.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/web/package.json ./apps/web/package.json
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm --filter web run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
# Next standalone's server.js binds to $HOSTNAME if set; Docker sets it to the
# container ID by default, which `localhost` can't reach — pin to 0.0.0.0 so
# the in-container healthcheck (and other intra-container clients) can connect.
ENV HOSTNAME=0.0.0.0

# Monorepo standalone output (outputFileTracingRoot = repo root) preserves the
# workspace layout: server.js lands at apps/web/server.js with node_modules at
# the bundle root. Copying the bundle to ./ yields /app/apps/web/server.js.
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

# Prisma CLI for `migrate deploy` at container start.
# Next's standalone output ships a slim node_modules that prunes the CLI's
# transitive deps; replace it with the full builder node_modules (root virtual
# store + the web workspace's symlinks) and bring in the schema + prisma.config.ts
# that the CLI loads from cwd.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=builder /app/apps/web/prisma ./apps/web/prisma
COPY --from=builder /app/apps/web/prisma.config.ts ./apps/web/prisma.config.ts

EXPOSE 3000

# Use 127.0.0.1 rather than `localhost`: Alpine's busybox wget resolves
# `localhost` to `[::1]` (IPv6) first, but Next.js binds to 0.0.0.0 (IPv4 only),
# so an IPv6 connect fails with "connection refused" and wget does not retry IPv4.
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/api/health/ready || exit 1

# Run migrations from the web workspace (prisma.config.ts is loaded from cwd),
# then start the standalone server.
CMD ["sh", "-c", "cd /app/apps/web && ./node_modules/.bin/prisma migrate deploy && cd /app && node apps/web/server.js"]
