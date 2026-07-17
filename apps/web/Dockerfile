# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
COPY packages/shared-types/package.json packages/shared-types/
RUN pnpm install --frozen-lockfile --filter web...

FROM deps AS build
ARG NEXT_PUBLIC_SITE_URL=https://heritage.nobatix.ir
# Baked into the build output: next.config.ts resolves the /uploads/* and
# plaque-download rewrite destinations from this at build time. It must be
# the runtime in-network API origin (http://api:4000/...), NOT localhost.
# The API is unreachable while the image builds; pages handle that (empty
# landing grid, no prerendered slug pages) and ISR refills them at runtime.
ARG API_BASE_URL=http://api:4000/api/v1
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
ENV API_BASE_URL=${API_BASE_URL}
COPY packages/shared-types packages/shared-types
COPY apps/web apps/web
RUN pnpm --filter web build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs
COPY --from=build /app/apps/web/public ./apps/web/public
COPY --from=build --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
