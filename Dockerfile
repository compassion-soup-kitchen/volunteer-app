FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.1.3 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
# Next standalone's server.js binds to $HOSTNAME if set; Docker sets it to the
# container ID by default, which `localhost` can't reach — pin to 0.0.0.0 so
# the in-container healthcheck (and other intra-container clients) can connect.
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Prisma CLI for `migrate deploy` at container start.
# Next's standalone output ships a slim node_modules that prunes the CLI's
# transitive deps (effect, …); replace it with the full builder node_modules
# and bring in the schema + the prisma.config.ts that the CLI loads from cwd.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health/ready || exit 1

CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && node server.js"]
